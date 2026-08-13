-- Accept both user referral balance codes (LOC...) and rider profile codes (REF...) for referrals

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_user_once
ON public.referrals (referred_user_id)
WHERE referred_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_rider_referral(_referrer_code text, _referred_user_id uuid)
RETURNS public.rider_referrals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := upper(btrim(_referrer_code));
  v_referrer record;
  v_referred record;
  v_row public.rider_referrals;
BEGIN
  IF v_code IS NULL OR length(v_code) = 0 OR _referred_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT r.id, r.user_id INTO v_referrer
  FROM public.user_referral_balances urb
  JOIN public.riders r ON r.user_id = urb.user_id
  WHERE upper(urb.referral_code) = v_code
  LIMIT 1;

  IF v_referrer.id IS NULL THEN
    SELECT r.id, r.user_id INTO v_referrer
    FROM public.riders r
    WHERE upper(r.referral_code) = v_code
    LIMIT 1;
  END IF;

  IF v_referrer.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, account_type INTO v_referred
  FROM public.riders
  WHERE user_id = _referred_user_id
  LIMIT 1;

  IF v_referred.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_referred.account_type NOT IN ('rider','business') THEN
    RETURN NULL;
  END IF;

  IF v_referrer.user_id = _referred_user_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.rider_referrals (
    referrer_user_id,
    referrer_rider_id,
    referred_user_id,
    referred_rider_id,
    referral_code,
    account_type,
    status
  ) VALUES (
    v_referrer.user_id,
    v_referrer.id,
    _referred_user_id,
    v_referred.id,
    v_code,
    v_referred.account_type,
    'pending'
  )
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_rider_referral(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_referral_signup(
  _referrer_code text,
  _referred_user_id uuid,
  _referred_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := upper(btrim(_referrer_code));
  v_referrer record;
  v_referred record;
  v_rider_referral public.rider_referrals;
  v_individual_referral public.referrals;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF v_code IS NULL OR length(v_code) = 0 OR _referred_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_referral');
  END IF;

  SELECT r.id, r.user_id INTO v_referrer
  FROM public.user_referral_balances urb
  JOIN public.riders r ON r.user_id = urb.user_id
  WHERE upper(urb.referral_code) = v_code
  LIMIT 1;

  IF v_referrer.id IS NULL THEN
    SELECT r.id, r.user_id INTO v_referrer
    FROM public.riders r
    WHERE upper(r.referral_code) = v_code
    LIMIT 1;
  END IF;

  IF v_referrer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_referral');
  END IF;

  IF v_referrer.user_id = _referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  SELECT id, account_type INTO v_referred
  FROM public.riders
  WHERE user_id = _referred_user_id
  LIMIT 1;

  IF v_referred.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_profile');
  END IF;

  IF v_referred.account_type IN ('rider','business') THEN
    INSERT INTO public.rider_referrals (
      referrer_user_id,
      referrer_rider_id,
      referred_user_id,
      referred_rider_id,
      referral_code,
      account_type,
      status
    ) VALUES (
      v_referrer.user_id,
      v_referrer.id,
      _referred_user_id,
      v_referred.id,
      v_code,
      v_referred.account_type,
      'pending'
    )
    ON CONFLICT (referred_user_id) DO NOTHING
    RETURNING * INTO v_rider_referral;

    RETURN jsonb_build_object(
      'success', true,
      'recorded', v_rider_referral.id IS NOT NULL,
      'duplicate', v_rider_referral.id IS NULL,
      'type', 'rider_business'
    );
  END IF;

  INSERT INTO public.referrals (
    referrer_id,
    referral_code,
    referred_user_id,
    referred_email,
    credits_earned,
    status
  ) VALUES (
    v_referrer.id,
    v_code,
    _referred_user_id,
    _referred_email,
    100,
    'pending'
  )
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING * INTO v_individual_referral;

  RETURN jsonb_build_object(
    'success', true,
    'recorded', v_individual_referral.id IS NOT NULL,
    'duplicate', v_individual_referral.id IS NULL,
    'type', 'individual'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_referral_signup(text, uuid, text) TO authenticated;

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

  SELECT * INTO _rr
  FROM public.rider_referrals
  WHERE referred_user_id = _uid
    AND status = 'pending'
    AND credited_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF _rr.id IS NOT NULL AND _rr.referrer_user_id <> _uid THEN
    _amount := 500;

    UPDATE public.rider_referrals
       SET status = 'completed',
           credits_earned = _amount,
           credited_at = now(),
           first_delivery_at = COALESCE(first_delivery_at, now())
     WHERE id = _rr.id;

    SELECT referral_code INTO _code
    FROM public.user_referral_balances
    WHERE user_id = _rr.referrer_user_id
    LIMIT 1;
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

  SELECT * INTO _r
  FROM public.referrals
  WHERE referred_user_id = _uid
    AND credited_at IS NULL
    AND status <> 'rejected'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF _r.id IS NOT NULL THEN
    SELECT user_id INTO _referrer_user
    FROM public.riders
    WHERE id = _r.referrer_id
    LIMIT 1;

    IF _referrer_user IS NOT NULL AND _referrer_user <> _uid THEN
      _amount := 100;

      SELECT referral_code INTO _code
      FROM public.user_referral_balances
      WHERE user_id = _referrer_user
      LIMIT 1;
      _code := COALESCE(_code, _r.referral_code, 'REF-' || substr(_referrer_user::text, 1, 8));

      INSERT INTO public.user_referral_balances (user_id, referral_code, balance, total_earned, total_referrals)
      VALUES (_referrer_user, _code, _amount, _amount, 1)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = public.user_referral_balances.balance + EXCLUDED.balance,
            total_earned = public.user_referral_balances.total_earned + EXCLUDED.total_earned,
            total_referrals = public.user_referral_balances.total_referrals + 1,
            updated_at = now();

      UPDATE public.referrals
         SET credited_at = now(),
             credits_earned = _amount,
             status = 'completed'
       WHERE id = _r.id;

      RETURN jsonb_build_object('success', true, 'credited', _amount, 'type', 'individual');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'credited', 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_referral_on_postcode() TO authenticated;

-- Backfill already-recorded individual referrals where the referred user has generated a postcode.
WITH eligible AS (
  SELECT DISTINCT ON (f.id)
    f.id,
    ref_r.user_id AS referrer_user_id,
    COALESCE(urb.referral_code, f.referral_code, 'REF-' || substr(ref_r.user_id::text, 1, 8)) AS payout_code
  FROM public.referrals f
  JOIN public.riders ref_r ON ref_r.id = f.referrer_id
  LEFT JOIN public.user_referral_balances urb ON urb.user_id = ref_r.user_id
  WHERE f.referred_user_id IS NOT NULL
    AND f.credited_at IS NULL
    AND f.status <> 'rejected'
    AND ref_r.user_id <> f.referred_user_id
    AND EXISTS (
      SELECT 1 FROM public.postcode_history ph
      WHERE ph.user_id = f.referred_user_id
      LIMIT 1
    )
), credited AS (
  UPDATE public.referrals f
     SET credited_at = now(),
         credits_earned = 100,
         status = 'completed'
    FROM eligible e
   WHERE f.id = e.id
   RETURNING e.referrer_user_id, e.payout_code
)
INSERT INTO public.user_referral_balances (user_id, referral_code, balance, total_earned, total_referrals)
SELECT referrer_user_id, payout_code, 100, 100, 1
FROM credited
ON CONFLICT (user_id) DO UPDATE
  SET balance = public.user_referral_balances.balance + EXCLUDED.balance,
      total_earned = public.user_referral_balances.total_earned + EXCLUDED.total_earned,
      total_referrals = public.user_referral_balances.total_referrals + 1,
      updated_at = now();

-- Backfill already-recorded rider/business referrals where the referred user has generated a postcode.
WITH eligible AS (
  SELECT DISTINCT ON (rr.id)
    rr.id,
    rr.referrer_user_id,
    COALESCE(urb.referral_code, rr.referral_code, 'REF-' || substr(rr.referrer_user_id::text, 1, 8)) AS payout_code
  FROM public.rider_referrals rr
  LEFT JOIN public.user_referral_balances urb ON urb.user_id = rr.referrer_user_id
  WHERE rr.credited_at IS NULL
    AND rr.status = 'pending'
    AND rr.referrer_user_id <> rr.referred_user_id
    AND EXISTS (
      SELECT 1 FROM public.postcode_history ph
      WHERE ph.user_id = rr.referred_user_id
      LIMIT 1
    )
), credited AS (
  UPDATE public.rider_referrals rr
     SET credited_at = now(),
         credits_earned = 500,
         status = 'completed',
         first_delivery_at = COALESCE(first_delivery_at, now())
    FROM eligible e
   WHERE rr.id = e.id
   RETURNING e.referrer_user_id, e.payout_code
)
INSERT INTO public.user_referral_balances (user_id, referral_code, balance, total_earned, total_referrals)
SELECT referrer_user_id, payout_code, 500, 500, 1
FROM credited
ON CONFLICT (user_id) DO UPDATE
  SET balance = public.user_referral_balances.balance + EXCLUDED.balance,
      total_earned = public.user_referral_balances.total_earned + EXCLUDED.total_earned,
      total_referrals = public.user_referral_balances.total_referrals + 1,
      updated_at = now();