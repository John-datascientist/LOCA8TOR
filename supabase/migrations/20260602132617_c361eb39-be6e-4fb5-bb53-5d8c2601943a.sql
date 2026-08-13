
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS credited_at timestamptz;

CREATE OR REPLACE FUNCTION public.credit_referral_on_postcode()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _rr public.rider_referrals;
  _r public.referrals;
  _referrer_user uuid;
  _amount int;
  _code text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- 1) Rider/Business referral: credit ₦500 to referrer when referred user generates a postcode
  SELECT * INTO _rr
  FROM public.rider_referrals
  WHERE referred_user_id = _uid AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;

  IF _rr.id IS NOT NULL AND _rr.referrer_user_id <> _uid THEN
    _amount := 500;

    UPDATE public.rider_referrals
       SET status = 'completed',
           credits_earned = _amount,
           credited_at = now(),
           first_delivery_at = COALESCE(first_delivery_at, now())
     WHERE id = _rr.id;

    SELECT referral_code INTO _code FROM public.riders WHERE user_id = _rr.referrer_user_id LIMIT 1;
    _code := COALESCE(_code, _rr.referral_code, 'REF-' || substr(_rr.referrer_user_id::text, 1, 8));

    INSERT INTO public.user_referral_balances (user_id, referral_code, balance, total_earned, total_referrals)
    VALUES (_rr.referrer_user_id, _code, _amount, _amount, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.user_referral_balances.balance + EXCLUDED.balance,
          total_earned = public.user_referral_balances.total_earned + EXCLUDED.total_earned,
          total_referrals = public.user_referral_balances.total_referrals + 1,
          updated_at = now();

    RETURN jsonb_build_object('success', true, 'credited', _amount, 'type', 'rider_business');
  END IF;

  -- 2) Individual referral: credit referrer once (uses legacy referrals table)
  SELECT * INTO _r
  FROM public.referrals
  WHERE referred_user_id = _uid
    AND credited_at IS NULL
    AND credits_earned > 0
  ORDER BY created_at ASC
  LIMIT 1;

  IF _r.id IS NOT NULL THEN
    SELECT user_id INTO _referrer_user FROM public.riders WHERE id = _r.referrer_id LIMIT 1;
    IF _referrer_user IS NOT NULL AND _referrer_user <> _uid THEN
      _amount := _r.credits_earned;

      SELECT referral_code INTO _code FROM public.riders WHERE user_id = _referrer_user LIMIT 1;
      _code := COALESCE(_code, _r.referral_code, 'REF-' || substr(_referrer_user::text, 1, 8));

      INSERT INTO public.user_referral_balances (user_id, referral_code, balance, total_earned, total_referrals)
      VALUES (_referrer_user, _code, _amount, _amount, 1)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = public.user_referral_balances.balance + EXCLUDED.balance,
            total_earned = public.user_referral_balances.total_earned + EXCLUDED.total_earned,
            total_referrals = public.user_referral_balances.total_referrals + 1,
            updated_at = now();

      UPDATE public.referrals SET credited_at = now(), status = 'completed' WHERE id = _r.id;

      RETURN jsonb_build_object('success', true, 'credited', _amount, 'type', 'individual');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'credited', 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_referral_on_postcode() TO authenticated;
