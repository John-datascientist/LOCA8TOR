
-- Table to track rider/business referrals with milestone gating
CREATE TABLE IF NOT EXISTS public.rider_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referrer_rider_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  referred_rider_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  account_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  credits_earned INTEGER NOT NULL DEFAULT 0,
  signup_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscribed_at TIMESTAMPTZ,
  first_delivery_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rider_referrals_referrer ON public.rider_referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_rider_referrals_referred ON public.rider_referrals(referred_user_id);

ALTER TABLE public.rider_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own rider referrals"
  ON public.rider_referrals FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid());

CREATE POLICY "Super admins read all rider referrals"
  ON public.rider_referrals FOR SELECT TO authenticated
  USING (is_super_admin((auth.jwt() ->> 'email'::text)));

-- Create a pending referral row when a referred rider/business signs up.
CREATE OR REPLACE FUNCTION public.create_rider_referral(
  _referrer_code TEXT,
  _referred_user_id UUID
) RETURNS public.rider_referrals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_referrer RECORD;
  v_referred RECORD;
  v_row public.rider_referrals;
BEGIN
  IF _referrer_code IS NULL OR _referred_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT id, user_id INTO v_referrer
  FROM public.riders WHERE referral_code = _referrer_code LIMIT 1;
  IF v_referrer.id IS NULL THEN RETURN NULL; END IF;

  SELECT id, account_type INTO v_referred
  FROM public.riders WHERE user_id = _referred_user_id LIMIT 1;
  IF v_referred.id IS NULL THEN RETURN NULL; END IF;

  -- Only rider or business accounts qualify
  IF v_referred.account_type NOT IN ('rider','business') THEN RETURN NULL; END IF;

  -- No self-referrals
  IF v_referrer.user_id = _referred_user_id THEN RETURN NULL; END IF;

  INSERT INTO public.rider_referrals (
    referrer_user_id, referrer_rider_id, referred_user_id, referred_rider_id,
    referral_code, account_type, status
  ) VALUES (
    v_referrer.user_id, v_referrer.id, _referred_user_id, v_referred.id,
    _referrer_code, v_referred.account_type, 'pending'
  )
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Idempotently checks all 3 conditions (signed up, paid subscription, first delivery)
-- and credits ₦500 to the referrer's user_referral_balances row when satisfied.
CREATE OR REPLACE FUNCTION public.check_rider_referral_qualification(
  _referred_user_id UUID
) RETURNS public.rider_referrals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ref public.rider_referrals;
  v_has_sub BOOLEAN := false;
  v_has_delivery BOOLEAN := false;
  v_rider_id UUID;
  v_now TIMESTAMPTZ := now();
  v_reward INTEGER := 500;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_ref FROM public.rider_referrals WHERE referred_user_id = _referred_user_id LIMIT 1;
  IF v_ref.id IS NULL THEN RETURN NULL; END IF;
  IF v_ref.status = 'credited' THEN RETURN v_ref; END IF;

  v_rider_id := v_ref.referred_rider_id;

  -- Active subscription (any active row for this user)
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _referred_user_id AND status = 'active'
  ) INTO v_has_sub;

  -- At least one delivered delivery (rider's own or business's)
  SELECT EXISTS(
    SELECT 1 FROM public.delivery_trackings
    WHERE status = 'delivered'
      AND (business_user_id = v_rider_id
           OR business_rider_id IN (SELECT id FROM public.business_riders WHERE linked_rider_id = v_rider_id))
  ) OR EXISTS(
    SELECT 1 FROM public.rider_delivery_logs
    WHERE status = 'delivered'
      AND (business_user_id = v_rider_id
           OR business_rider_id IN (SELECT id FROM public.business_riders WHERE linked_rider_id = v_rider_id))
  ) INTO v_has_delivery;

  -- Update milestone timestamps
  IF v_has_sub AND v_ref.subscribed_at IS NULL THEN
    UPDATE public.rider_referrals SET subscribed_at = v_now WHERE id = v_ref.id;
  END IF;
  IF v_has_delivery AND v_ref.first_delivery_at IS NULL THEN
    UPDATE public.rider_referrals SET first_delivery_at = v_now WHERE id = v_ref.id;
  END IF;

  -- Determine new status
  IF v_has_sub AND v_has_delivery THEN
    v_new_status := 'credited';
  ELSIF v_has_sub THEN
    v_new_status := 'subscribed';
  ELSIF v_has_delivery THEN
    v_new_status := 'delivered_pending_subscription';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE public.rider_referrals SET status = v_new_status WHERE id = v_ref.id;

  -- If fully qualified, credit the referrer (idempotent guard: credits_earned = 0)
  IF v_new_status = 'credited' AND v_ref.credits_earned = 0 THEN
    UPDATE public.rider_referrals
      SET credits_earned = v_reward, credited_at = v_now
      WHERE id = v_ref.id AND credits_earned = 0;

    -- Add to referrer's user balance, creating the row if needed
    INSERT INTO public.user_referral_balances (user_id, referral_code, balance, total_earned, total_referrals)
    VALUES (
      v_ref.referrer_user_id,
      v_ref.referral_code,
      v_reward,
      v_reward,
      1
    )
    ON CONFLICT (user_id) DO UPDATE SET
      balance = public.user_referral_balances.balance + v_reward,
      total_earned = public.user_referral_balances.total_earned + v_reward,
      total_referrals = public.user_referral_balances.total_referrals + 1,
      updated_at = v_now;
  END IF;

  SELECT * INTO v_ref FROM public.rider_referrals WHERE id = v_ref.id;
  RETURN v_ref;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_rider_referral(TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_rider_referral_qualification(UUID) TO authenticated, anon, service_role;
