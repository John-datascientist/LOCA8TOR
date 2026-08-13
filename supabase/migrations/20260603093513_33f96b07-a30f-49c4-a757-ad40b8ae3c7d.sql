CREATE OR REPLACE FUNCTION public.expire_old_quiz_credits(_uid uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  _old_credits integer;
  _consumed integer;
  _to_expire integer;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id
    FROM public.quiz_balance_ledger
    WHERE (_uid IS NULL OR user_id = _uid)
  LOOP
    -- Super admin earnings do not expire.
    IF EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = r.user_id
        AND public.is_super_admin(u.email)
    ) THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(amount), 0)::int INTO _old_credits
    FROM public.quiz_balance_ledger
    WHERE user_id = r.user_id
      AND reason = 'quiz_score'
      AND created_at < now() - interval '24 hours';

    SELECT
      COALESCE(-SUM(amount) FILTER (WHERE reason IN ('withdrawal','expiry') AND amount < 0), 0)::int
      - COALESCE(SUM(amount) FILTER (WHERE reason = 'withdrawal_reversal'), 0)::int
      INTO _consumed
    FROM public.quiz_balance_ledger
    WHERE user_id = r.user_id;

    _to_expire := GREATEST(0, _old_credits - _consumed);

    IF _to_expire > 0 THEN
      INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, notes)
      VALUES (r.user_id, -_to_expire, 'expiry', '24h auto-expiry');
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_quiz_play(_ip text DEFAULT NULL::text)
RETURNS TABLE(allowed boolean, plays_today integer, plays_remaining integer, play_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _count integer;
  _new_id uuid;
  _recent_id uuid;
  _daily_limit integer := 2;
  _is_super boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT public.is_super_admin(u.email) INTO _is_super
  FROM auth.users u
  WHERE u.id = _uid;

  SELECT q.id INTO _recent_id
  FROM public.quiz_play_log q
  WHERE q.user_id = _uid
    AND q.played_at > now() - interval '10 seconds'
    AND q.score = 0
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_balance_ledger l WHERE l.play_id = q.id
    )
  ORDER BY q.played_at DESC
  LIMIT 1;

  SELECT COUNT(*) INTO _count
  FROM public.quiz_play_log
  WHERE user_id = _uid AND play_date = _today;

  IF _recent_id IS NOT NULL THEN
    RETURN QUERY SELECT true, _count, CASE WHEN _is_super THEN 999 ELSE GREATEST(0, _daily_limit - _count) END, _recent_id;
    RETURN;
  END IF;

  IF NOT _is_super AND _count >= _daily_limit THEN
    RETURN QUERY SELECT false, _count, 0, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.quiz_play_log (user_id, ip_address, play_date)
  VALUES (_uid, _ip, _today)
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT true, _count + 1, CASE WHEN _is_super THEN 999 ELSE GREATEST(0, _daily_limit - (_count + 1)) END, _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  _type text, _full_name text, _network_provider text, _state_of_residence text,
  _address text, _postcode text, _amount integer,
  _ip_address text DEFAULT NULL::text, _phone text DEFAULT NULL::text
)
RETURNS withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _profile_phone text;
  _submitted_phone text;
  _final_phone text;
  _profile_name text;
  _is_banned boolean;
  _ban_reason text;
  _result public.withdrawals;
  _balance integer;
  _today_total integer;
  _daily_cap integer := 200;
  _share_total int;
  _is_super boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to withdraw';
  END IF;

  SELECT r.is_banned, r.ban_reason INTO _is_banned, _ban_reason
  FROM public.riders r WHERE r.user_id = _uid LIMIT 1;

  SELECT lower(u.email), public.is_super_admin(u.email)
  INTO _email, _is_super
  FROM auth.users u WHERE u.id = _uid AND u.email_confirmed_at IS NOT NULL;

  IF _email IS NULL THEN
    RAISE EXCEPTION 'You must verify your email before withdrawing';
  END IF;

  IF COALESCE(_is_banned, false) AND NOT _is_super THEN
    RAISE EXCEPTION 'Your account has been banned and cannot withdraw.%',
      CASE WHEN _ban_reason IS NOT NULL THEN ' Reason: ' || _ban_reason ELSE '' END;
  END IF;

  IF public.is_individual_account(_uid) AND NOT _is_super THEN
    SELECT count(DISTINCT recipient_phone) INTO _share_total
    FROM public.whatsapp_shares WHERE user_id = _uid;
    IF _share_total < 10 THEN
      RAISE EXCEPTION 'SHARE_GATE_REQUIRED: Share Loca8tor on WhatsApp with 10 unique numbers to unlock withdrawals. You have completed % of 10.', _share_total;
    END IF;
  END IF;

  SELECT public.normalize_nigerian_phone(r.phone), r.full_name
  INTO _profile_phone, _profile_name
  FROM public.riders r WHERE r.user_id = _uid LIMIT 1;

  _submitted_phone := public.normalize_nigerian_phone(_phone);

  IF _submitted_phone ~ '^0[7-9][0-9]{9}$' THEN
    _final_phone := _submitted_phone;
  ELSE
    _final_phone := _profile_phone;
  END IF;

  IF _final_phone IS NOT NULL AND _final_phone ~ '^0[7-9][0-9]{9}$' THEN
    UPDATE public.riders SET phone = _final_phone
    WHERE user_id = _uid AND phone IS DISTINCT FROM _final_phone;
  END IF;

  IF (_final_phone IS NULL OR _final_phone !~ '^0[7-9][0-9]{9}$') AND NOT _is_super THEN
    RAISE EXCEPTION 'Your registered phone number (%) is not a valid Nigerian mobile number. Please correct it and try again.', coalesce(_profile_phone, '');
  END IF;

  IF _type NOT IN ('airtime', 'data') THEN
    RAISE EXCEPTION 'Choose airtime or data';
  END IF;

  IF _amount IS NULL OR _amount < 50 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Withdrawal amount is outside the allowed range';
  END IF;

  IF length(trim(coalesce(_network_provider, ''))) = 0
     OR length(trim(coalesce(_state_of_residence, ''))) = 0
     OR length(trim(coalesce(_address, ''))) = 0
     OR length(trim(coalesce(_postcode, ''))) = 0 THEN
    RAISE EXCEPTION 'Complete all withdrawal details';
  END IF;

  IF NOT _is_super THEN
    SELECT COALESCE(SUM(amount), 0)::int INTO _today_total
    FROM public.withdrawals w
    WHERE lower(w.email) = _email
      AND w.created_at > now() - interval '24 hours'
      AND w.status NOT IN ('cancelled', 'rejected');

    IF _today_total + _amount > _daily_cap THEN
      RAISE EXCEPTION 'Daily withdrawal limit is ₦%. You have already requested ₦% in the last 24 hours.', _daily_cap, _today_total;
    END IF;
  END IF;

  PERFORM public.expire_old_quiz_credits(_uid);
  SELECT COALESCE(SUM(amount), 0)::integer INTO _balance
  FROM public.quiz_balance_ledger WHERE user_id = _uid;

  IF _balance < _amount AND NOT _is_super THEN
    RAISE EXCEPTION 'Insufficient balance. You have ₦% available (earnings expire 24 hours after they are earned).', _balance;
  END IF;

  INSERT INTO public.withdrawals (
    type, full_name, phone, email, network_provider,
    state_of_residence, address, postcode, amount, status, ip_address
  ) VALUES (
    _type,
    trim(coalesce(nullif(trim(coalesce(_full_name, '')), ''), _profile_name, 'Super Admin')),
    coalesce(_final_phone, '00000000000'), _email,
    trim(_network_provider), trim(_state_of_residence),
    trim(_address), upper(trim(_postcode)),
    _amount, 'pending',
    nullif(trim(coalesce(_ip_address, '')), '')
  )
  RETURNING * INTO _result;

  INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, withdrawal_id)
  VALUES (_uid, -_amount, 'withdrawal', _result.id);

  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_business_code(p_code text)
RETURNS TABLE(ok boolean, business_user_id uuid, message text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz public.riders%ROWTYPE;
  _is_super boolean := false;
BEGIN
  SELECT public.is_super_admin(u.email) INTO _is_super
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Business code is required'::text;
    RETURN;
  END IF;

  SELECT * INTO biz FROM public.riders
    WHERE business_code = upper(trim(p_code))
      AND account_type = 'business'
    LIMIT 1;

  IF biz.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Business code not found'::text;
    RETURN;
  END IF;

  IF biz.is_banned AND NOT _is_super THEN
    RETURN QUERY SELECT false, NULL::uuid, 'This business is suspended'::text;
    RETURN;
  END IF;

  IF COALESCE(biz.subscription_status, 'none') NOT IN ('active','trialing','trial') AND NOT _is_super THEN
    RETURN QUERY SELECT false, NULL::uuid, 'This business does not have an active subscription'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, biz.id, 'ok'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_effective_subscription_status(p_user_id uuid)
RETURNS TABLE(effective_status text, account_type text, is_linked boolean, is_grandfathered boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rider public.riders%ROWTYPE;
  v_parent public.riders%ROWTYPE;
  v_link_business_id uuid;
  v_cutoff timestamptz := '2026-05-31 00:00:00+00';
  _is_super boolean := false;
BEGIN
  SELECT public.is_super_admin(u.email) INTO _is_super
  FROM auth.users u
  WHERE u.id = p_user_id;

  SELECT * INTO v_rider FROM public.riders WHERE user_id = p_user_id LIMIT 1;
  IF v_rider.id IS NULL THEN
    RETURN QUERY SELECT CASE WHEN _is_super THEN 'active' ELSE 'none' END::text, NULL::text, false, _is_super;
    RETURN;
  END IF;

  IF _is_super THEN
    RETURN QUERY SELECT 'active'::text, v_rider.account_type, true, true;
    RETURN;
  END IF;

  IF v_rider.account_type = 'business' THEN
    RETURN QUERY SELECT COALESCE(v_rider.subscription_status,'none'), 'business'::text, false,
                        (v_rider.created_at < v_cutoff);
    RETURN;
  END IF;

  SELECT business_user_id INTO v_link_business_id FROM public.business_riders
    WHERE linked_rider_id = v_rider.id
    ORDER BY created_at DESC LIMIT 1;

  IF v_link_business_id IS NULL THEN
    RETURN QUERY SELECT COALESCE(v_rider.subscription_status,'none'),
                        v_rider.account_type, false, (v_rider.created_at < v_cutoff);
    RETURN;
  END IF;

  SELECT * INTO v_parent FROM public.riders WHERE id = v_link_business_id LIMIT 1;
  RETURN QUERY SELECT COALESCE(v_parent.subscription_status,'none'),
                      v_rider.account_type, true, (v_rider.created_at < v_cutoff);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_old_quiz_credits(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_quiz_play(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_withdrawal_request(text, text, text, text, text, text, integer, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_business_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_effective_subscription_status(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.expire_old_quiz_credits(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_quiz_play(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(text, text, text, text, text, text, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_business_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_subscription_status(uuid) TO authenticated, service_role;