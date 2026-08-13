-- Allow admins to reject withdrawal requests
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check;
ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text]));

-- Normalize phone numbers consistently before duplicate checks.
CREATE OR REPLACE FUNCTION public.normalize_phone_key(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN regexp_replace(coalesce(_phone, ''), '\D', '', 'g') LIKE '234%'
      AND length(regexp_replace(coalesce(_phone, ''), '\D', '', 'g')) = 13
      THEN '0' || substring(regexp_replace(coalesce(_phone, ''), '\D', '', 'g') from 4)
    WHEN length(regexp_replace(coalesce(_phone, ''), '\D', '', 'g')) = 10
      AND regexp_replace(coalesce(_phone, ''), '\D', '', 'g') ~ '^[789]'
      THEN '0' || regexp_replace(coalesce(_phone, ''), '\D', '', 'g')
    ELSE regexp_replace(coalesce(_phone, ''), '\D', '', 'g')
  END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS riders_phone_normalized_unique_idx
  ON public.riders (public.normalize_phone_key(phone))
  WHERE length(public.normalize_phone_key(phone)) >= 6;

CREATE OR REPLACE FUNCTION public.riders_enforce_unique_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text;
  _exists uuid;
BEGIN
  _norm := public.normalize_phone_key(NEW.phone);
  IF length(_norm) < 6 THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _exists
  FROM public.riders
  WHERE public.normalize_phone_key(phone) = _norm
    AND id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;

  IF _exists IS NOT NULL THEN
    RAISE EXCEPTION 'phone_already_registered' USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_riders_enforce_unique_phone ON public.riders;
CREATE TRIGGER trg_riders_enforce_unique_phone
BEFORE INSERT OR UPDATE OF phone ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.riders_enforce_unique_phone();

CREATE OR REPLACE FUNCTION public.check_signup_unique(
  p_email text,
  p_full_name text,
  p_phone text,
  p_ip text
)
RETURNS TABLE(ok boolean, conflict text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(coalesce(trim(p_email), ''));
  v_name text := lower(coalesce(trim(p_full_name), ''));
  v_phone text := coalesce(trim(p_phone), '');
  v_phone_key text := public.normalize_phone_key(p_phone);
  v_ip text := coalesce(trim(p_ip), '');
BEGIN
  IF v_email <> '' AND EXISTS (SELECT 1 FROM banned_identifiers WHERE kind='email' AND lower(value)=v_email) THEN
    RETURN QUERY SELECT false, 'email', 'This email is blocked from creating new accounts.'; RETURN;
  END IF;
  IF v_phone_key <> '' AND EXISTS (
    SELECT 1 FROM banned_identifiers
    WHERE kind='phone' AND public.normalize_phone_key(value) = v_phone_key
  ) THEN
    RETURN QUERY SELECT false, 'phone', 'This phone number is blocked from creating new accounts.'; RETURN;
  END IF;
  IF v_ip <> '' AND EXISTS (SELECT 1 FROM banned_identifiers WHERE kind='ip' AND value=v_ip) THEN
    RETURN QUERY SELECT false, 'ip', 'This network is blocked from creating new accounts.'; RETURN;
  END IF;

  IF v_phone_key <> '' AND EXISTS (SELECT 1 FROM riders WHERE public.normalize_phone_key(phone) = v_phone_key) THEN
    RETURN QUERY SELECT false, 'phone', 'This phone number is already linked to another account.'; RETURN;
  END IF;
  IF v_name <> '' AND EXISTS (SELECT 1 FROM riders WHERE lower(full_name) = v_name) THEN
    RETURN QUERY SELECT false, 'full_name', 'An account already exists with this exact name. Please use a different name.'; RETURN;
  END IF;
  IF v_ip <> '' AND EXISTS (SELECT 1 FROM riders WHERE signup_ip = v_ip AND is_banned = false) THEN
    RETURN QUERY SELECT false, 'ip', 'An account has already been created from this network. Please sign in instead.'; RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_signup_unique(text,text,text,text) TO anon, authenticated;

-- Server-side combined quiz limit: one play per signed-in user per UTC day across all quiz categories.
CREATE OR REPLACE FUNCTION public.register_quiz_play(_ip text DEFAULT NULL)
RETURNS TABLE(allowed boolean, plays_today integer, plays_remaining integer, play_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _count integer;
  _new_id uuid;
  _daily_limit integer := 1;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT COUNT(*) INTO _count
  FROM public.quiz_play_log
  WHERE user_id = _uid AND play_date = _today;

  IF _count >= _daily_limit THEN
    RETURN QUERY SELECT false, _count, 0, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.quiz_play_log (user_id, ip_address, play_date)
  VALUES (_uid, _ip, _today)
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT true, _count + 1, GREATEST(0, _daily_limit - (_count + 1)), _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_quiz_play(text) TO authenticated;

-- Future referral reward amount: ₦300.
CREATE OR REPLACE FUNCTION public.claim_device_referral(_referrer_code text, _referred_device_id text, _referred_ip text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _referrer public.device_referrals;
  _referred_account public.device_referrals;
  _canonical_referred_device_id text;
  _amount integer := 300;
  _ip_block text;
  _today_count integer;
BEGIN
  IF _referrer_code IS NULL OR length(trim(_referrer_code)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  IF _referred_device_id IS NULL OR length(trim(_referred_device_id)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_device');
  END IF;

  SELECT * INTO _referrer
  FROM public.device_referrals
  WHERE referral_code = upper(btrim(_referrer_code))
  FOR UPDATE;

  IF _referrer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  SELECT public.get_device_referral_by_identity(_referred_device_id, NULL, NULL, _referred_ip)
  INTO _referred_account;

  _canonical_referred_device_id := coalesce(_referred_account.device_id, _referred_device_id);

  IF _referrer.device_id = _canonical_referred_device_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  IF _referrer.ip_address IS NOT NULL
     AND _referred_ip IS NOT NULL
     AND _referred_ip <> 'unknown'
     AND _referrer.ip_address = _referred_ip THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral_ip');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.device_referral_claims c
    LEFT JOIN public.device_referral_aliases a ON a.alias_device_id = c.referred_device_id
    WHERE c.referred_device_id = _canonical_referred_device_id
       OR c.referred_device_id = _referred_device_id
       OR (_referred_account.id IS NOT NULL AND a.canonical_referral_id = _referred_account.id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  IF _referred_account.id IS NOT NULL THEN
    IF _referred_account.created_at <= now() - interval '7 days' THEN
      RETURN jsonb_build_object('success', false, 'error', 'existing_user');
    END IF;
  END IF;

  IF _referred_ip IS NOT NULL AND _referred_ip <> 'unknown' THEN
    IF EXISTS (SELECT 1 FROM public.device_referral_claims WHERE referred_ip = _referred_ip) THEN
      RETURN jsonb_build_object('success', false, 'error', 'ip_already_used');
    END IF;

    _ip_block := regexp_replace(_referred_ip, '\.\d+$', '');
    SELECT count(*) INTO _today_count
    FROM public.device_referral_claims
    WHERE referrer_code = upper(btrim(_referrer_code))
      AND created_at > now() - interval '24 hours'
      AND referred_ip LIKE _ip_block || '%';

    IF _today_count >= 50 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
    END IF;
  END IF;

  INSERT INTO public.device_referral_claims (
    referrer_code, referrer_device_id, referred_device_id, referred_ip, amount
  ) VALUES (
    upper(btrim(_referrer_code)), _referrer.device_id, _canonical_referred_device_id, _referred_ip, _amount
  );

  UPDATE public.device_referrals
     SET balance = balance + _amount,
         total_earned = total_earned + _amount,
         total_referrals = total_referrals + 1,
         updated_at = now()
   WHERE id = _referrer.id;

  RETURN jsonb_build_object('success', true, 'amount', _amount);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_device_referral(text,text,text) TO anon, authenticated;

-- PIN-staff compatible helper for banning users from withdrawal rows.
CREATE OR REPLACE FUNCTION public.admin_ban_account_by_email(
  p_email text,
  p_reason text,
  p_admin_email text DEFAULT NULL,
  p_admin_pin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  _staff_id uuid;
  _actor text;
  _phone text;
  _ip text;
BEGIN
  SELECT id INTO _staff_id
  FROM public.admin_staff
  WHERE lower(coalesce(email, '')) = lower(coalesce(p_admin_email, ''))
    AND pin = coalesce(p_admin_pin, '')
    AND is_active = true
  LIMIT 1;

  IF NOT public.is_super_admin(_caller_email) AND _staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  _actor := coalesce(nullif(_caller_email, ''), lower(coalesce(p_admin_email, 'staff')));

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  SELECT phone, signup_ip INTO _phone, _ip FROM public.riders WHERE user_id = _uid;

  UPDATE public.riders
     SET is_banned = true,
         ban_reason = p_reason,
         banned_at = now()
   WHERE user_id = _uid;

  INSERT INTO public.banned_identifiers(kind, value, reason, banned_by, banned_user_id)
  VALUES ('email', p_email, p_reason, _actor, _uid)
  ON CONFLICT (kind, lower(value)) DO UPDATE
    SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_user_id = EXCLUDED.banned_user_id;

  IF _phone IS NOT NULL AND _phone <> '' THEN
    INSERT INTO public.banned_identifiers(kind, value, reason, banned_by, banned_user_id)
    VALUES ('phone', _phone, p_reason, _actor, _uid)
    ON CONFLICT (kind, lower(value)) DO UPDATE
      SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_user_id = EXCLUDED.banned_user_id;
  END IF;

  IF _ip IS NOT NULL AND _ip <> '' THEN
    INSERT INTO public.banned_identifiers(kind, value, reason, banned_by, banned_user_id)
    VALUES ('ip', _ip, p_reason, _actor, _uid)
    ON CONFLICT (kind, lower(value)) DO UPDATE
      SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_user_id = EXCLUDED.banned_user_id;
  END IF;

  INSERT INTO public.user_notifications(user_id, title, body, kind)
  VALUES (
    _uid,
    'Your account has been banned',
    coalesce('Reason: ' || p_reason, 'Your account has been banned by an administrator.') ||
    E'\n\nIf you believe this is a mistake, please contact support at support@loca8tor.com.',
    'ban'
  );

  INSERT INTO public.admin_audit_log(actor_email, action, target, metadata)
  VALUES (_actor, 'ban_account', _uid::text, jsonb_build_object('reason', p_reason, 'email', p_email, 'phone', _phone, 'ip', _ip));

  RETURN jsonb_build_object('success', true, 'user_id', _uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ban_account_by_email(text,text,text,text) TO anon, authenticated;

-- PIN-staff compatible helpers for allowed-country feature management.
CREATE OR REPLACE FUNCTION public.admin_can_manage_with_pin(_admin_email text, _admin_pin text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(lower(coalesce(auth.jwt() ->> 'email', '')))
    OR EXISTS (
      SELECT 1 FROM public.admin_staff
      WHERE lower(coalesce(email, '')) = lower(coalesce(_admin_email, ''))
        AND pin = coalesce(_admin_pin, '')
        AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.admin_list_allowed_countries(_admin_email text DEFAULT NULL, _admin_pin text DEFAULT NULL)
RETURNS TABLE(id uuid, country_code text, country_name text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_can_manage_with_pin(_admin_email, _admin_pin) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN QUERY SELECT ac.id, ac.country_code, ac.country_name, ac.created_at FROM public.allowed_countries ac ORDER BY ac.country_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_allowed_country(_country_code text, _country_name text, _admin_email text DEFAULT NULL, _admin_pin text DEFAULT NULL)
RETURNS public.allowed_countries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.allowed_countries;
BEGIN
  IF NOT public.admin_can_manage_with_pin(_admin_email, _admin_pin) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.allowed_countries(country_code, country_name)
  VALUES (upper(trim(_country_code)), trim(_country_name))
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_allowed_country(_id uuid, _admin_email text DEFAULT NULL, _admin_pin text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_can_manage_with_pin(_admin_email, _admin_pin) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  DELETE FROM public.allowed_countries WHERE id = _id;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_can_manage_with_pin(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_allowed_countries(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_allowed_country(text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_allowed_country(uuid,text,text) TO anon, authenticated;