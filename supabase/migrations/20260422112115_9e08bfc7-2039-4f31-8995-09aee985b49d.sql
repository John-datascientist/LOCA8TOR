-- Drop overly-permissive write policies on device_referrals
DROP POLICY IF EXISTS "Anyone can insert device referrals" ON public.device_referrals;
DROP POLICY IF EXISTS "Anyone can update device referrals" ON public.device_referrals;

-- Drop permissive insert policy on claims (writes must go through SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "Anyone can insert referral claims" ON public.device_referral_claims;

-- Make sure RLS is enabled (idempotent)
ALTER TABLE public.device_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_referral_claims ENABLE ROW LEVEL SECURITY;

-- Reinforce uniqueness: one device can only ever be referred once (already in original migration but ensure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_referred_device'
  ) THEN
    ALTER TABLE public.device_referral_claims
      ADD CONSTRAINT unique_referred_device UNIQUE (referred_device_id);
  END IF;
END$$;

-- Create a SECURITY DEFINER function so the app can create its own referral account
-- without granting blanket INSERT to the public role.
CREATE OR REPLACE FUNCTION public.create_device_referral(
  _device_id TEXT,
  _referral_code TEXT,
  _ip_address TEXT
)
RETURNS public.device_referrals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing public.device_referrals;
  _new public.device_referrals;
BEGIN
  -- Return existing account if device already registered
  SELECT * INTO _existing FROM device_referrals WHERE device_id = _device_id;
  IF _existing.id IS NOT NULL THEN
    RETURN _existing;
  END IF;

  INSERT INTO device_referrals (device_id, referral_code, ip_address)
  VALUES (_device_id, _referral_code, _ip_address)
  RETURNING * INTO _new;

  RETURN _new;
END;
$$;

-- Lock down direct read of the referrer's device_id by limiting the claim history view
-- to a function that only returns non-PII fields when looking up by code.
CREATE OR REPLACE FUNCTION public.get_referral_history(_referral_code TEXT)
RETURNS TABLE (
  id UUID,
  amount INTEGER,
  trigger_event TEXT,
  created_at TIMESTAMPTZ,
  referred_device_short TEXT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.amount,
    c.trigger_event,
    c.created_at,
    -- Mask device id for privacy: show only last 6 chars
    '***' || RIGHT(c.referred_device_id, 6) AS referred_device_short,
    'credited'::TEXT AS status
  FROM device_referral_claims c
  WHERE c.referrer_code = _referral_code
  ORDER BY c.created_at DESC
  LIMIT 50;
$$;