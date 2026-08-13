-- Device-based referral accounts (no auth required)
CREATE TABLE public.device_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_referrals_code ON public.device_referrals(referral_code);
CREATE INDEX idx_device_referrals_device ON public.device_referrals(device_id);

ALTER TABLE public.device_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read device referrals"
  ON public.device_referrals FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert device referrals"
  ON public.device_referrals FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update device referrals"
  ON public.device_referrals FOR UPDATE TO public USING (true);

-- Claims log with abuse-prevention uniqueness
CREATE TABLE public.device_referral_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_code TEXT NOT NULL,
  referrer_device_id TEXT NOT NULL,
  referred_device_id TEXT NOT NULL,
  referred_ip TEXT,
  amount INTEGER NOT NULL DEFAULT 100,
  trigger_event TEXT NOT NULL DEFAULT 'postcode_generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_referred_device UNIQUE (referred_device_id),
  CONSTRAINT no_self_referral CHECK (referrer_device_id <> referred_device_id)
);

CREATE INDEX idx_referral_claims_referrer ON public.device_referral_claims(referrer_code);
CREATE INDEX idx_referral_claims_ip ON public.device_referral_claims(referred_ip);

ALTER TABLE public.device_referral_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read referral claims"
  ON public.device_referral_claims FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert referral claims"
  ON public.device_referral_claims FOR INSERT TO public WITH CHECK (true);

-- Atomic credit function: validates and credits in one shot
CREATE OR REPLACE FUNCTION public.claim_device_referral(
  _referrer_code TEXT,
  _referred_device_id TEXT,
  _referred_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer RECORD;
  _amount INTEGER := 100;
  _existing_ip_count INTEGER;
BEGIN
  -- Find referrer
  SELECT * INTO _referrer FROM device_referrals WHERE referral_code = _referrer_code;
  IF _referrer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- Self-referral check
  IF _referrer.device_id = _referred_device_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  -- Already credited this device?
  IF EXISTS (SELECT 1 FROM device_referral_claims WHERE referred_device_id = _referred_device_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  -- Same IP recently used as referred? (abuse guard)
  IF _referred_ip IS NOT NULL AND _referred_ip <> 'unknown' THEN
    SELECT COUNT(*) INTO _existing_ip_count
      FROM device_referral_claims
      WHERE referred_ip = _referred_ip AND referrer_code = _referrer_code;
    IF _existing_ip_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'ip_already_used');
    END IF;
  END IF;

  -- Insert claim
  INSERT INTO device_referral_claims (referrer_code, referrer_device_id, referred_device_id, referred_ip, amount)
  VALUES (_referrer_code, _referrer.device_id, _referred_device_id, _referred_ip, _amount);

  -- Credit referrer
  UPDATE device_referrals
    SET balance = balance + _amount,
        total_earned = total_earned + _amount,
        total_referrals = total_referrals + 1,
        updated_at = now()
    WHERE id = _referrer.id;

  RETURN jsonb_build_object('success', true, 'amount', _amount);
END;
$$;

-- Withdrawal debit function (server-side balance check)
CREATE OR REPLACE FUNCTION public.debit_referral_balance(
  _device_id TEXT,
  _amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current INTEGER;
BEGIN
  SELECT balance INTO _current FROM device_referrals WHERE device_id = _device_id FOR UPDATE;
  IF _current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_account');
  END IF;
  IF _current < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'balance', _current);
  END IF;
  UPDATE device_referrals SET balance = balance - _amount, updated_at = now() WHERE device_id = _device_id;
  RETURN jsonb_build_object('success', true, 'new_balance', _current - _amount);
END;
$$;