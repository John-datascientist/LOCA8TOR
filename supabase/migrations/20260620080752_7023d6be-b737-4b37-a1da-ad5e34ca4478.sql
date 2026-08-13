
-- 1) Business referral reward updated to ₦2,000; rider referral removed.
CREATE OR REPLACE FUNCTION public.credit_referrer_after_first_payment(_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _rr public.rider_referrals;
  _reward int;
  _now timestamptz := now();
BEGIN
  SELECT * INTO _rr
  FROM public.rider_referrals
  WHERE referred_user_id = _referred_user_id
    AND status <> 'credited'
  ORDER BY created_at ASC
  LIMIT 1;

  IF _rr.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_pending_referral');
  END IF;

  IF _rr.account_type = 'business' THEN
    _reward := 2000;
  ELSE
    -- Rider referrals no longer pay a reward.
    RETURN jsonb_build_object('ok', false, 'reason', 'rider_referrals_disabled');
  END IF;

  IF NOT public.is_referrer_eligible(_rr.referrer_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'referrer_not_eligible');
  END IF;

  UPDATE public.rider_referrals
    SET status = 'credited',
        credits_earned = _reward,
        credited_at = _now,
        subscribed_at = COALESCE(subscribed_at, _now)
    WHERE id = _rr.id
      AND status <> 'credited';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_credited');
  END IF;

  INSERT INTO public.user_referral_balances (user_id, referral_code, balance, total_earned, total_referrals)
  VALUES (_rr.referrer_user_id, _rr.referral_code, _reward, _reward, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.user_referral_balances.balance + _reward,
    total_earned = public.user_referral_balances.total_earned + _reward,
    total_referrals = public.user_referral_balances.total_referrals + 1,
    updated_at = _now;

  RETURN jsonb_build_object('ok', true, 'referrer_user_id', _rr.referrer_user_id, 'reward_ngn', _reward, 'referred_account_type', _rr.account_type);
END;
$function$;

-- 2) Allow PIN-authenticated admin staff (not just super admins) to list registered users for compliance.
CREATE OR REPLACE FUNCTION public.admin_list_registered_users(
  _admin_email text DEFAULT NULL,
  _admin_pin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  _jwt_email text;
  _authorized boolean := false;
BEGIN
  -- Super-admin path (JWT email)
  BEGIN
    _jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  EXCEPTION WHEN OTHERS THEN _jwt_email := '';
  END;
  IF _jwt_email <> '' AND public.is_super_admin(_jwt_email) THEN
    _authorized := true;
  END IF;

  -- Staff PIN path
  IF NOT _authorized AND _admin_email IS NOT NULL AND _admin_pin IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.admin_staff
      WHERE lower(email) = lower(_admin_email)
        AND pin = _admin_pin
        AND is_active = true
    ) THEN
      _authorized := true;
    END IF;
  END IF;

  IF NOT _authorized THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.signed_up_at DESC)
    FROM (
      SELECT
        u.id AS user_id,
        u.email::text AS email,
        COALESCE(r.full_name, (u.raw_user_meta_data->>'full_name')) AS full_name,
        r.phone,
        COALESCE(r.account_type, 'individual') AS account_type,
        r.business_name,
        r.business_code,
        r.cac_number,
        r.postcode,
        r.location,
        r.referral_code,
        COALESCE(r.subscription_status, 'none') AS subscription_status,
        (u.email_confirmed_at IS NOT NULL) AS email_verified,
        u.created_at AS signed_up_at,
        COALESCE(r.is_banned, false) AS is_banned,
        r.ban_reason
      FROM auth.users u
      LEFT JOIN public.riders r ON r.user_id = u.id
    ) t
  ), '[]'::jsonb);
END;
$function$;
