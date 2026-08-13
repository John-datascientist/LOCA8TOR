CREATE TABLE IF NOT EXISTS public.device_referral_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_device_id TEXT NOT NULL UNIQUE,
  canonical_referral_id UUID NOT NULL REFERENCES public.device_referrals(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.device_referral_aliases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_device_referral_aliases_canonical_referral_id
  ON public.device_referral_aliases(canonical_referral_id);

CREATE INDEX IF NOT EXISTS idx_device_referral_aliases_referral_code
  ON public.device_referral_aliases(referral_code);

INSERT INTO public.device_referral_aliases (alias_device_id, canonical_referral_id, referral_code)
SELECT dr.device_id, dr.id, dr.referral_code
FROM public.device_referrals dr
ON CONFLICT (alias_device_id) DO UPDATE
SET canonical_referral_id = EXCLUDED.canonical_referral_id,
    referral_code = EXCLUDED.referral_code,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.resolve_device_referral_identity(
  _device_id TEXT,
  _stable_device_id TEXT DEFAULT NULL,
  _known_referral_code TEXT DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL,
  _requested_referral_code TEXT DEFAULT NULL,
  _create_if_missing BOOLEAN DEFAULT false
)
RETURNS public.device_referrals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing public.device_referrals;
  _candidate_ids TEXT[] := array_remove(ARRAY[
    NULLIF(BTRIM(COALESCE(_device_id, '')), ''),
    NULLIF(BTRIM(COALESCE(_stable_device_id, '')), '')
  ], NULL);
  _normalized_known_code TEXT := UPPER(NULLIF(BTRIM(COALESCE(_known_referral_code, '')), ''));
  _normalized_requested_code TEXT := UPPER(NULLIF(BTRIM(COALESCE(_requested_referral_code, '')), ''));
  _normalized_ip TEXT := NULLIF(BTRIM(COALESCE(_ip_address, '')), '');
  _preferred_device_id TEXT := COALESCE(
    NULLIF(BTRIM(COALESCE(_stable_device_id, '')), ''),
    NULLIF(BTRIM(COALESCE(_device_id, '')), '')
  );
BEGIN
  IF LOWER(COALESCE(_normalized_ip, '')) = 'unknown' THEN
    _normalized_ip := NULL;
  END IF;

  IF array_length(_candidate_ids, 1) IS NULL AND _normalized_known_code IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT dr.*
  INTO _existing
  FROM public.device_referral_aliases a
  JOIN public.device_referrals dr ON dr.id = a.canonical_referral_id
  WHERE a.alias_device_id = ANY(_candidate_ids)
  ORDER BY dr.total_earned DESC, dr.balance DESC, dr.updated_at DESC
  LIMIT 1;

  IF _existing.id IS NULL AND array_length(_candidate_ids, 1) IS NOT NULL THEN
    SELECT *
    INTO _existing
    FROM public.device_referrals dr
    WHERE dr.device_id = ANY(_candidate_ids)
    ORDER BY dr.total_earned DESC, dr.balance DESC, dr.updated_at DESC
    LIMIT 1;
  END IF;

  IF _existing.id IS NULL AND _normalized_known_code IS NOT NULL THEN
    SELECT *
    INTO _existing
    FROM public.device_referrals dr
    WHERE dr.referral_code = _normalized_known_code
    LIMIT 1;
  END IF;

  IF _existing.id IS NULL THEN
    IF NOT _create_if_missing THEN
      RETURN NULL;
    END IF;

    IF _preferred_device_id IS NULL OR LENGTH(_preferred_device_id) < 8 OR _normalized_requested_code IS NULL THEN
      RETURN NULL;
    END IF;

    INSERT INTO public.device_referrals (device_id, referral_code, ip_address)
    VALUES (_preferred_device_id, _normalized_requested_code, _normalized_ip)
    RETURNING * INTO _existing;
  ELSE
    IF _preferred_device_id IS NOT NULL
      AND LENGTH(_preferred_device_id) >= 8
      AND _existing.device_id <> _preferred_device_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.device_referrals dr2
        WHERE dr2.device_id = _preferred_device_id
          AND dr2.id <> _existing.id
      )
    THEN
      UPDATE public.device_referrals
      SET device_id = _preferred_device_id,
          ip_address = COALESCE(_normalized_ip, ip_address),
          updated_at = now()
      WHERE id = _existing.id
      RETURNING * INTO _existing;
    ELSIF _normalized_ip IS NOT NULL AND COALESCE(_existing.ip_address, '') <> _normalized_ip THEN
      UPDATE public.device_referrals
      SET ip_address = COALESCE(ip_address, _normalized_ip),
          updated_at = now()
      WHERE id = _existing.id
      RETURNING * INTO _existing;
    END IF;
  END IF;

  IF array_length(_candidate_ids, 1) IS NOT NULL THEN
    INSERT INTO public.device_referral_aliases (alias_device_id, canonical_referral_id, referral_code)
    SELECT cid, _existing.id, _existing.referral_code
    FROM unnest(_candidate_ids) AS cid
    WHERE cid IS NOT NULL AND LENGTH(cid) >= 8
    ON CONFLICT (alias_device_id) DO UPDATE
    SET canonical_referral_id = EXCLUDED.canonical_referral_id,
        referral_code = EXCLUDED.referral_code,
        updated_at = now();
  END IF;

  RETURN _existing;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_device_referral_by_identity(
  _device_id TEXT,
  _stable_device_id TEXT DEFAULT NULL,
  _known_referral_code TEXT DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL
)
RETURNS public.device_referrals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.resolve_device_referral_identity(
    _device_id,
    _stable_device_id,
    _known_referral_code,
    _ip_address,
    NULL,
    false
  );
END;
$$;

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
BEGIN
  RETURN public.resolve_device_referral_identity(
    _device_id,
    NULL,
    NULL,
    _ip_address,
    _referral_code,
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_device_referral(
  _device_id TEXT,
  _stable_device_id TEXT,
  _known_referral_code TEXT,
  _referral_code TEXT,
  _ip_address TEXT
)
RETURNS public.device_referrals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.resolve_device_referral_identity(
    _device_id,
    _stable_device_id,
    _known_referral_code,
    _ip_address,
    _referral_code,
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_referral_balance(
  _device_id TEXT,
  _amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.debit_referral_balance(_device_id, NULL, NULL, _amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_referral_balance(
  _device_id TEXT,
  _stable_device_id TEXT,
  _known_referral_code TEXT,
  _amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account public.device_referrals;
  _current INTEGER;
  _today_total INTEGER;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;
  IF _amount < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'below_minimum');
  END IF;

  SELECT public.get_device_referral_by_identity(_device_id, _stable_device_id, _known_referral_code, NULL)
  INTO _account;

  IF _account.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_account');
  END IF;

  SELECT balance INTO _current
  FROM public.device_referrals
  WHERE id = _account.id
  FOR UPDATE;

  IF _current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_account');
  END IF;
  IF _current < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'balance', _current);
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO _today_total
  FROM public.withdrawals
  WHERE address LIKE 'Referral payout · device ' || substring(_account.device_id, 1, 16) || '%'
    AND created_at > now() - interval '24 hours';

  IF _today_total + _amount > 50000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'daily_cap_exceeded');
  END IF;

  UPDATE public.device_referrals
  SET balance = balance - _amount,
      updated_at = now()
  WHERE id = _account.id;

  RETURN jsonb_build_object('success', true, 'new_balance', _current - _amount);
END;
$$;

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
  _referrer public.device_referrals;
  _referred_account public.device_referrals;
  _canonical_referred_device_id TEXT;
  _amount INTEGER := 100;
  _ip_block TEXT;
  _today_count INTEGER;
BEGIN
  IF _referrer_code IS NULL OR length(trim(_referrer_code)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  IF _referred_device_id IS NULL OR length(trim(_referred_device_id)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_device');
  END IF;

  SELECT * INTO _referrer
  FROM public.device_referrals
  WHERE referral_code = UPPER(BTRIM(_referrer_code))
  FOR UPDATE;

  IF _referrer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  SELECT public.get_device_referral_by_identity(_referred_device_id, NULL, NULL, _referred_ip)
  INTO _referred_account;

  _canonical_referred_device_id := COALESCE(_referred_account.device_id, _referred_device_id);

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
    WHERE referrer_code = UPPER(BTRIM(_referrer_code))
      AND created_at > now() - interval '24 hours'
      AND referred_ip LIKE _ip_block || '%';

    IF _today_count >= 50 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
    END IF;
  END IF;

  INSERT INTO public.device_referral_claims (
    referrer_code,
    referrer_device_id,
    referred_device_id,
    referred_ip,
    amount
  ) VALUES (
    UPPER(BTRIM(_referrer_code)),
    _referrer.device_id,
    _canonical_referred_device_id,
    _referred_ip,
    _amount
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