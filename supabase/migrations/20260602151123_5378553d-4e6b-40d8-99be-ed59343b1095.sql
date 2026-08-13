-- ============================================================
-- WhatsApp Share Gate
-- Individual users must share Loca8tor with 10 unique WhatsApp
-- numbers before any withdrawal or individual referral payout.
-- ============================================================

-- 1. Storage table for share records
CREATE TABLE IF NOT EXISTS public.whatsapp_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  recipient_phone text NOT NULL,
  share_message text,
  ip_address text,
  device_id text,
  user_agent text,
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_shares_unique_per_user UNIQUE (user_id, recipient_phone)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_shares_user ON public.whatsapp_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_shares_created ON public.whatsapp_shares(created_at);

GRANT SELECT, INSERT ON public.whatsapp_shares TO authenticated;
GRANT ALL ON public.whatsapp_shares TO service_role;

ALTER TABLE public.whatsapp_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own whatsapp shares"
ON public.whatsapp_shares FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins read all whatsapp shares"
ON public.whatsapp_shares FOR SELECT
TO authenticated
USING (is_super_admin((auth.jwt() ->> 'email'::text)));

-- Inserts only via SECURITY DEFINER RPC (no direct insert policy)

-- 2. Phone normalizer (returns +E164 or NULL)
CREATE OR REPLACE FUNCTION public.normalize_whatsapp_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_clean text;
BEGIN
  IF _phone IS NULL THEN RETURN NULL; END IF;
  v_clean := regexp_replace(_phone, '[^0-9+]', '', 'g');
  -- Local NG -> +234
  IF v_clean ~ '^0[7-9][0-9]{9}$' THEN
    v_clean := '+234' || substr(v_clean, 2);
  ELSIF v_clean ~ '^234[0-9]{10}$' THEN
    v_clean := '+' || v_clean;
  ELSIF v_clean ~ '^\+?[1-9][0-9]{9,14}$' THEN
    IF left(v_clean, 1) <> '+' THEN
      v_clean := '+' || v_clean;
    END IF;
  ELSE
    RETURN NULL;
  END IF;
  RETURN v_clean;
END;
$$;

-- 3. Record a share
CREATE OR REPLACE FUNCTION public.record_whatsapp_share(
  _recipient_phone text,
  _message text DEFAULT NULL,
  _ip_address text DEFAULT NULL,
  _device_id text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _normalized text;
  _own_phone text;
  _today_count int;
  _total int;
  _inserted boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  _normalized := public.normalize_whatsapp_phone(_recipient_phone);
  IF _normalized IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_phone');
  END IF;

  -- Block sharing to own phone
  SELECT public.normalize_whatsapp_phone(phone) INTO _own_phone
  FROM public.riders WHERE user_id = _uid LIMIT 1;
  IF _own_phone IS NOT NULL AND _own_phone = _normalized THEN
    RETURN jsonb_build_object('success', false, 'error', 'own_phone');
  END IF;

  -- Daily rate limit (30 inserts/day)
  SELECT count(*) INTO _today_count
  FROM public.whatsapp_shares
  WHERE user_id = _uid AND created_at > now() - interval '24 hours';
  IF _today_count >= 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;

  INSERT INTO public.whatsapp_shares (user_id, recipient_phone, share_message, ip_address, device_id, user_agent)
  VALUES (_uid, _normalized, _message, _ip_address, _device_id, _user_agent)
  ON CONFLICT (user_id, recipient_phone) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;

  SELECT count(DISTINCT recipient_phone) INTO _total
  FROM public.whatsapp_shares WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', _inserted > 0,
    'duplicate', _inserted = 0,
    'total_shares', _total,
    'required', 10,
    'remaining', GREATEST(0, 10 - _total),
    'gate_passed', _total >= 10
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_whatsapp_share(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_whatsapp_share(text, text, text, text, text) TO authenticated;

-- 4. Gate check
CREATE OR REPLACE FUNCTION public.has_completed_share_gate(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT count(DISTINCT recipient_phone) >= 10
    FROM public.whatsapp_shares
    WHERE user_id = _user_id
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.has_completed_share_gate(uuid) TO authenticated;

-- Helper: is this user an "individual" subject to the gate?
CREATE OR REPLACE FUNCTION public.is_individual_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT account_type IS NULL OR account_type NOT IN ('rider','business')
    FROM public.riders WHERE user_id = _user_id LIMIT 1
  ), true);
$$;

GRANT EXECUTE ON FUNCTION public.is_individual_account(uuid) TO authenticated;

-- 5. Status RPC for the UI
CREATE OR REPLACE FUNCTION public.get_share_gate_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _total int;
  _is_individual boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;
  SELECT count(DISTINCT recipient_phone) INTO _total
  FROM public.whatsapp_shares WHERE user_id = _uid;
  _is_individual := public.is_individual_account(_uid);
  RETURN jsonb_build_object(
    'authenticated', true,
    'is_individual', _is_individual,
    'total_shares', _total,
    'required', 10,
    'remaining', GREATEST(0, 10 - _total),
    'gate_passed', (_total >= 10) OR NOT _is_individual,
    'applies', _is_individual
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_share_gate_status() TO authenticated;

-- 6. Gate withdrawal RPC (individuals only)
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  _type text, _full_name text, _network_provider text, _state_of_residence text,
  _address text, _postcode text, _amount integer,
  _ip_address text DEFAULT NULL::text, _phone text DEFAULT NULL::text
)
RETURNS withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to withdraw';
  END IF;

  SELECT r.is_banned, r.ban_reason
  INTO _is_banned, _ban_reason
  FROM public.riders r
  WHERE r.user_id = _uid
  LIMIT 1;

  IF COALESCE(_is_banned, false) THEN
    RAISE EXCEPTION 'Your account has been banned and cannot withdraw.%',
      CASE WHEN _ban_reason IS NOT NULL THEN ' Reason: ' || _ban_reason ELSE '' END;
  END IF;

  SELECT lower(u.email) INTO _email
  FROM auth.users u
  WHERE u.id = _uid AND u.email_confirmed_at IS NOT NULL;

  IF _email IS NULL THEN
    RAISE EXCEPTION 'You must verify your email before withdrawing';
  END IF;

  -- WhatsApp share gate: individuals must complete 10 unique shares
  IF public.is_individual_account(_uid) THEN
    SELECT count(DISTINCT recipient_phone) INTO _share_total
    FROM public.whatsapp_shares WHERE user_id = _uid;
    IF _share_total < 10 THEN
      RAISE EXCEPTION 'SHARE_GATE_REQUIRED: Share Loca8tor on WhatsApp with 10 unique numbers to unlock withdrawals. You have completed % of 10.', _share_total;
    END IF;
  END IF;

  SELECT public.normalize_nigerian_phone(r.phone), r.full_name
  INTO _profile_phone, _profile_name
  FROM public.riders r
  WHERE r.user_id = _uid
  LIMIT 1;

  _submitted_phone := public.normalize_nigerian_phone(_phone);

  IF _submitted_phone ~ '^0[7-9][0-9]{9}$' THEN
    _final_phone := _submitted_phone;
  ELSE
    _final_phone := _profile_phone;
  END IF;

  IF _final_phone IS NOT NULL AND _final_phone ~ '^0[7-9][0-9]{9}$' THEN
    UPDATE public.riders
    SET phone = _final_phone
    WHERE user_id = _uid AND phone IS DISTINCT FROM _final_phone;
  END IF;

  IF _final_phone IS NULL OR _final_phone !~ '^0[7-9][0-9]{9}$' THEN
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

  SELECT COALESCE(SUM(amount), 0)::int INTO _today_total
  FROM public.withdrawals w
  WHERE lower(w.email) = _email
    AND w.created_at > now() - interval '24 hours'
    AND w.status NOT IN ('cancelled', 'rejected');

  IF _today_total + _amount > _daily_cap THEN
    RAISE EXCEPTION 'Daily withdrawal limit is ₦%. You have already requested ₦% in the last 24 hours.', _daily_cap, _today_total;
  END IF;

  PERFORM public.expire_old_quiz_credits(_uid);
  SELECT COALESCE(SUM(amount), 0)::integer INTO _balance
  FROM public.quiz_balance_ledger
  WHERE user_id = _uid;

  IF _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance. You have ₦% available (earnings expire 24h after they are earned).', _balance;
  END IF;

  INSERT INTO public.withdrawals (
    type, full_name, phone, email, network_provider,
    state_of_residence, address, postcode, amount, status, ip_address
  ) VALUES (
    _type,
    trim(coalesce(nullif(trim(coalesce(_full_name, '')), ''), _profile_name)),
    _final_phone, _email,
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

-- 7. Patch credit_referral_on_postcode to gate the individual ₦100 branch
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
      -- Individual ₦100 branch is gated by referrer's share progress
      IF public.is_individual_account(_referrer_user)
         AND NOT public.has_completed_share_gate(_referrer_user) THEN
        RETURN jsonb_build_object(
          'success', true,
          'credited', 0,
          'pending_reason', 'share_gate',
          'referrer', _referrer_user
        );
      END IF;

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

-- 8. Sweep RPC: credit any pending individual referrals where the referrer has just passed the gate
CREATE OR REPLACE FUNCTION public.credit_pending_referrals_for_referrer()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _credited int := 0;
  _referrer_rider_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.has_completed_share_gate(_uid) THEN
    RETURN jsonb_build_object('success', true, 'credited', 0, 'gate_passed', false);
  END IF;

  SELECT id INTO _referrer_rider_id FROM public.riders WHERE user_id = _uid LIMIT 1;
  IF _referrer_rider_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'credited', 0);
  END IF;

  WITH eligible AS (
    SELECT f.id, COALESCE(urb.referral_code, f.referral_code, 'REF-' || substr(_uid::text, 1, 8)) AS payout_code
    FROM public.referrals f
    LEFT JOIN public.user_referral_balances urb ON urb.user_id = _uid
    WHERE f.referrer_id = _referrer_rider_id
      AND f.credited_at IS NULL
      AND f.status <> 'rejected'
      AND f.referred_user_id IS NOT NULL
      AND f.referred_user_id <> _uid
      AND EXISTS (
        SELECT 1 FROM public.postcode_history ph WHERE ph.user_id = f.referred_user_id LIMIT 1
      )
  ), credited AS (
    UPDATE public.referrals f
       SET credited_at = now(),
           credits_earned = 100,
           status = 'completed'
      FROM eligible e
     WHERE f.id = e.id
     RETURNING e.payout_code
  ), agg AS (
    SELECT count(*)::int AS n, MAX(payout_code) AS code FROM credited
  )
  INSERT INTO public.user_referral_balances (user_id, referral_code, balance, total_earned, total_referrals)
  SELECT _uid, COALESCE(code, 'REF-' || substr(_uid::text, 1, 8)), n * 100, n * 100, n
  FROM agg WHERE n > 0
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_referral_balances.balance + EXCLUDED.balance,
        total_earned = public.user_referral_balances.total_earned + EXCLUDED.total_earned,
        total_referrals = public.user_referral_balances.total_referrals + EXCLUDED.total_referrals,
        updated_at = now()
  RETURNING (balance) INTO _credited;

  RETURN jsonb_build_object('success', true, 'credited', COALESCE(_credited, 0), 'gate_passed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_pending_referrals_for_referrer() TO authenticated;