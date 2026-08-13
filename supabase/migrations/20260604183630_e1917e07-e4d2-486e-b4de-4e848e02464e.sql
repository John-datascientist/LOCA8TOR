CREATE OR REPLACE FUNCTION public.admin_get_platform_overview(_admin_email text DEFAULT NULL::text, _admin_pin text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_super boolean := false;
  _is_staff boolean := false;
  _jwt_email text := '';
  _total_riders bigint := 0;
  _total_businesses bigint := 0;
  _total_postcodes bigint := 0;
  _total_quiz_payout bigint := 0;
  _pending_payout bigint := 0;
  _total_referral_earned bigint := 0;
  _total_referral_balance bigint := 0;
  _total_referrals bigint := 0;
BEGIN
  BEGIN
    _jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  EXCEPTION WHEN OTHERS THEN _jwt_email := '';
  END;

  IF _jwt_email <> '' AND EXISTS (SELECT 1 FROM public.super_admins WHERE lower(email) = _jwt_email) THEN
    _is_super := true;
  END IF;

  IF NOT _is_super AND _admin_email IS NOT NULL AND _admin_pin IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.admin_staff WHERE lower(email) = lower(_admin_email) AND pin = _admin_pin AND is_active = true) THEN
      _is_staff := true;
    END IF;
  END IF;

  IF NOT (_is_super OR _is_staff) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  -- Count ALL non-business accounts as "users/riders" (rider, individual, NULL all count)
  SELECT count(*) INTO _total_riders FROM public.riders WHERE account_type IS DISTINCT FROM 'business';
  SELECT count(*) INTO _total_businesses FROM public.riders WHERE account_type = 'business';
  SELECT count(*) INTO _total_postcodes FROM public.postcodes;

  SELECT coalesce(sum(amount) FILTER (WHERE amount > 0), 0)::bigint INTO _total_quiz_payout FROM public.quiz_balance_ledger;
  SELECT coalesce(sum(amount) FILTER (WHERE status = 'pending'), 0)::bigint INTO _pending_payout FROM public.withdrawals;

  SELECT coalesce(sum(total_earned), 0)::bigint, coalesce(sum(balance), 0)::bigint, coalesce(sum(total_referrals), 0)::bigint
    INTO _total_referral_earned, _total_referral_balance, _total_referrals
  FROM public.user_referral_balances;

  RETURN jsonb_build_object(
    'total_riders', _total_riders,
    'total_businesses', _total_businesses,
    'total_postcodes', _total_postcodes,
    'total_quiz_payout', _total_quiz_payout,
    'pending_payout', _pending_payout,
    'total_referral_earned', _total_referral_earned,
    'total_referral_balance', _total_referral_balance,
    'total_referrals', _total_referrals
  );
END;
$function$;