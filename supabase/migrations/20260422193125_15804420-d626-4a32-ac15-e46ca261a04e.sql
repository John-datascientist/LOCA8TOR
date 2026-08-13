
-- 1. Table
CREATE TABLE public.user_referral_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  migrated_from_device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_referral_balances_user_id ON public.user_referral_balances(user_id);
CREATE INDEX idx_user_referral_balances_code ON public.user_referral_balances(referral_code);

ALTER TABLE public.user_referral_balances ENABLE ROW LEVEL SECURITY;

-- 2. RLS — public read, no direct writes
CREATE POLICY "Anyone can read user referral balances"
  ON public.user_referral_balances FOR SELECT
  USING (true);

CREATE POLICY "No direct insert on user referral balances"
  ON public.user_referral_balances FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct update on user referral balances"
  ON public.user_referral_balances FOR UPDATE
  USING (false) WITH CHECK (false);

CREATE POLICY "No direct delete on user referral balances"
  ON public.user_referral_balances FOR DELETE
  USING (false);

-- 3. Helper: generate unique LOC code
CREATE OR REPLACE FUNCTION public.gen_user_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  _code TEXT;
  _exists BOOLEAN;
BEGIN
  LOOP
    _code := 'LOC' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.user_referral_balances WHERE referral_code = _code) INTO _exists;
    IF NOT _exists THEN
      RETURN _code;
    END IF;
  END LOOP;
END;
$$;

-- 4. Auto-create balance on rider profile creation
CREATE OR REPLACE FUNCTION public.create_user_referral_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_referral_balances (user_id, referral_code)
  VALUES (NEW.user_id, public.gen_user_referral_code())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_user_referral_balance
  AFTER INSERT ON public.riders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_referral_balance();

-- 5. Migrate device balance to a user (called right after signup)
CREATE OR REPLACE FUNCTION public.migrate_device_to_user_referral(
  _user_id UUID,
  _device_id TEXT,
  _stable_device_id TEXT DEFAULT NULL,
  _known_referral_code TEXT DEFAULT NULL
)
RETURNS public.user_referral_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _device_row public.device_referrals;
  _user_row public.user_referral_balances;
  _candidate_ids TEXT[];
BEGIN
  -- Build candidate id list
  _candidate_ids := ARRAY(
    SELECT DISTINCT x FROM unnest(ARRAY[_device_id, _stable_device_id]) AS x
    WHERE x IS NOT NULL AND length(x) > 0
  );

  -- Look up best device referral row (alias-aware)
  SELECT dr.* INTO _device_row
  FROM public.device_referrals dr
  WHERE dr.device_id = ANY(_candidate_ids)
     OR (_known_referral_code IS NOT NULL AND dr.referral_code = _known_referral_code)
     OR EXISTS (
       SELECT 1 FROM public.device_referral_aliases a
       WHERE a.canonical_referral_id = dr.id
         AND a.alias_device_id = ANY(_candidate_ids)
     )
  ORDER BY dr.total_earned DESC, dr.balance DESC, dr.updated_at DESC
  LIMIT 1;

  -- Ensure user has a balance row
  SELECT * INTO _user_row FROM public.user_referral_balances WHERE user_id = _user_id;
  IF _user_row IS NULL THEN
    INSERT INTO public.user_referral_balances (user_id, referral_code)
    VALUES (_user_id, COALESCE(_device_row.referral_code, public.gen_user_referral_code()))
    RETURNING * INTO _user_row;
  END IF;

  -- If we found a device balance, transfer it
  IF _device_row IS NOT NULL AND (_device_row.balance > 0 OR _device_row.total_earned > 0) THEN
    UPDATE public.user_referral_balances
    SET balance = balance + _device_row.balance,
        total_earned = total_earned + _device_row.total_earned,
        total_referrals = total_referrals + _device_row.total_referrals,
        migrated_from_device_id = _device_row.device_id,
        -- prefer device's well-known referral code so existing share links keep working
        referral_code = _device_row.referral_code,
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING * INTO _user_row;

    -- Zero out the device row so it can't be claimed twice
    UPDATE public.device_referrals
    SET balance = 0,
        updated_at = now()
    WHERE id = _device_row.id;
  END IF;

  RETURN _user_row;
EXCEPTION WHEN unique_violation THEN
  -- referral_code collision (rare): retry with a fresh code
  UPDATE public.user_referral_balances
  SET referral_code = public.gen_user_referral_code()
  WHERE user_id = _user_id
  RETURNING * INTO _user_row;
  RETURN _user_row;
END;
$$;

-- 6. Read my own balance (auth required)
CREATE OR REPLACE FUNCTION public.get_my_referral_balance()
RETURNS public.user_referral_balances
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.user_referral_balances;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO _row FROM public.user_referral_balances WHERE user_id = auth.uid();
  RETURN _row;
END;
$$;

-- 7. Atomic debit for withdrawals
CREATE OR REPLACE FUNCTION public.debit_user_referral_balance(_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.user_referral_balances;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  UPDATE public.user_referral_balances
  SET balance = balance - _amount, updated_at = now()
  WHERE user_id = auth.uid() AND balance >= _amount
  RETURNING * INTO _row;

  IF _row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  RETURN jsonb_build_object('success', true, 'new_balance', _row.balance);
END;
$$;
