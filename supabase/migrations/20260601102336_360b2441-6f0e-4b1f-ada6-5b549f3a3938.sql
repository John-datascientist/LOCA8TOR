
-- 1. Allow 'expiry' as a ledger reason
ALTER TABLE public.quiz_balance_ledger DROP CONSTRAINT IF EXISTS quiz_balance_ledger_reason_check;
ALTER TABLE public.quiz_balance_ledger
  ADD CONSTRAINT quiz_balance_ledger_reason_check
  CHECK (reason IN ('quiz_score','withdrawal','withdrawal_reversal','adjustment','expiry'));

-- 2. Expire unwithdrawn quiz credits older than 48h (FIFO across the ledger).
CREATE OR REPLACE FUNCTION public.expire_old_quiz_credits(_uid uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  _old_credits integer;
  _consumed integer;
  _to_expire integer;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id
    FROM public.quiz_balance_ledger
    WHERE (_uid IS NULL OR user_id = _uid)
  LOOP
    -- Total quiz credits older than 48h
    SELECT COALESCE(SUM(amount), 0)::int INTO _old_credits
    FROM public.quiz_balance_ledger
    WHERE user_id = r.user_id
      AND reason = 'quiz_score'
      AND created_at < now() - interval '48 hours';

    -- Total already consumed: withdrawals + prior expiries, net of reversals.
    -- FIFO assumption: consumption applies to oldest credits first.
    SELECT
      COALESCE(-SUM(amount) FILTER (WHERE reason IN ('withdrawal','expiry') AND amount < 0), 0)::int
      - COALESCE(SUM(amount) FILTER (WHERE reason = 'withdrawal_reversal'), 0)::int
      INTO _consumed
    FROM public.quiz_balance_ledger
    WHERE user_id = r.user_id;

    _to_expire := GREATEST(0, _old_credits - _consumed);

    IF _to_expire > 0 THEN
      INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, notes)
      VALUES (r.user_id, -_to_expire, 'expiry', '48h auto-expiry');
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_old_quiz_credits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_old_quiz_credits(uuid) TO authenticated, service_role;

-- 3. get_quiz_balance: lazy-expire then return ledger sum
CREATE OR REPLACE FUNCTION public.get_quiz_balance()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bal integer;
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;
  PERFORM public.expire_old_quiz_credits(_uid);
  SELECT COALESCE(SUM(amount),0)::int INTO _bal
  FROM public.quiz_balance_ledger WHERE user_id = _uid;
  RETURN GREATEST(0, _bal);
END;
$$;

-- 4. available_quiz_balance: lazy-expire then return ledger sum
CREATE OR REPLACE FUNCTION public.available_quiz_balance(_uid uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE _bal integer;
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;
  PERFORM public.expire_old_quiz_credits(_uid);
  SELECT COALESCE(SUM(amount),0)::int INTO _bal
  FROM public.quiz_balance_ledger WHERE user_id = _uid;
  RETURN GREATEST(0, _bal);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.available_quiz_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.available_quiz_balance(uuid) TO authenticated;

-- 5. Block banned users from creating withdrawals, and lazy-expire before balance check.
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to withdraw';
  END IF;

  -- Hard block banned accounts
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

  -- Lazy expire then balance check
  PERFORM public.expire_old_quiz_credits(_uid);
  SELECT COALESCE(SUM(amount), 0)::integer INTO _balance
  FROM public.quiz_balance_ledger
  WHERE user_id = _uid;

  IF _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance. You have ₦% available (earnings expire 48h after they are earned).', _balance;
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

-- 6. RLS insert policy on withdrawals: also block banned users defense-in-depth
DROP POLICY IF EXISTS "Verified users insert own withdrawals" ON public.withdrawals;
CREATE POLICY "Verified users insert own withdrawals"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND lower(email) = lower((auth.jwt() ->> 'email'))
  AND public.current_user_email_verified()
  AND amount >= 50
  AND amount <= 100000
  AND length(trim(full_name)) > 0
  AND length(trim(phone)) >= 10
  AND length(trim(email)) > 3
  AND type = ANY (ARRAY['airtime'::text, 'data'::text])
  AND amount <= public.available_quiz_balance(auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.riders r
    WHERE r.user_id = auth.uid() AND r.is_banned = true
  )
);

-- 7. Enable pg_cron and schedule hourly expiry sweep for all users
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('expire-old-quiz-credits-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-old-quiz-credits-hourly',
  '17 * * * *',
  $$ SELECT public.expire_old_quiz_credits(NULL); $$
);
