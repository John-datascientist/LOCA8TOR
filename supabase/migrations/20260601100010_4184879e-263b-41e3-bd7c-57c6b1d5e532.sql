
-- 1. Ledger table
CREATE TABLE public.quiz_balance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('quiz_score','withdrawal','withdrawal_reversal','adjustment')),
  play_id uuid,
  withdrawal_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX quiz_balance_ledger_play_unique
  ON public.quiz_balance_ledger(play_id) WHERE play_id IS NOT NULL;
CREATE UNIQUE INDEX quiz_balance_ledger_withdrawal_unique
  ON public.quiz_balance_ledger(withdrawal_id, reason) WHERE withdrawal_id IS NOT NULL;
CREATE INDEX quiz_balance_ledger_user_idx
  ON public.quiz_balance_ledger(user_id, created_at DESC);

GRANT SELECT ON public.quiz_balance_ledger TO authenticated;
GRANT ALL ON public.quiz_balance_ledger TO service_role;

ALTER TABLE public.quiz_balance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ledger"
  ON public.quiz_balance_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins read all ledger"
  ON public.quiz_balance_ledger FOR SELECT TO authenticated
  USING (is_super_admin((auth.jwt() ->> 'email')));

-- 2. Balance helper
CREATE OR REPLACE FUNCTION public.get_quiz_balance()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.quiz_balance_ledger
  WHERE user_id = auth.uid();
$$;

-- 3. Update record_quiz_score to also credit ledger atomically
CREATE OR REPLACE FUNCTION public.record_quiz_score(_play_id uuid, _score integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _safe integer := GREATEST(0, LEAST(COALESCE(_score, 0), 100));
  _owned uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  -- Verify the play belongs to this user before doing anything
  SELECT id INTO _owned
  FROM public.quiz_play_log
  WHERE id = _play_id AND user_id = _uid;

  IF _owned IS NULL THEN
    RAISE EXCEPTION 'Quiz play not found for this user';
  END IF;

  UPDATE public.quiz_play_log
  SET score = _safe
  WHERE id = _play_id AND user_id = _uid;

  IF _safe > 0 THEN
    INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, play_id)
    VALUES (_uid, _safe, 'quiz_score', _play_id)
    ON CONFLICT (play_id) WHERE play_id IS NOT NULL DO NOTHING;
  END IF;
END;
$$;

-- 4. Update create_withdrawal_request to debit ledger atomically
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
  _result public.withdrawals;
  _balance integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to withdraw';
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

  -- Server-side balance check using the ledger
  SELECT COALESCE(SUM(amount), 0)::integer INTO _balance
  FROM public.quiz_balance_ledger
  WHERE user_id = _uid;

  IF _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance. You have ₦% available.', _balance;
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

  -- Atomic debit
  INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, withdrawal_id)
  VALUES (_uid, -_amount, 'withdrawal', _result.id);

  RETURN _result;
END;
$$;

-- 5. Auto-reverse ledger when a withdrawal is cancelled/rejected
CREATE OR REPLACE FUNCTION public.reverse_withdrawal_ledger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  _uid uuid;
  _debit integer;
BEGIN
  IF NEW.status IN ('cancelled','rejected') AND OLD.status NOT IN ('cancelled','rejected') THEN
    SELECT user_id, amount INTO _uid, _debit
    FROM public.quiz_balance_ledger
    WHERE withdrawal_id = NEW.id AND reason = 'withdrawal'
    LIMIT 1;

    IF _uid IS NOT NULL AND _debit IS NOT NULL THEN
      INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, withdrawal_id, notes)
      VALUES (_uid, -_debit, 'withdrawal_reversal', NEW.id, 'Auto-reversal: ' || NEW.status)
      ON CONFLICT (withdrawal_id, reason) WHERE withdrawal_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawals_reverse_ledger ON public.withdrawals;
CREATE TRIGGER withdrawals_reverse_ledger
  AFTER UPDATE OF status ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.reverse_withdrawal_ledger();

-- 6. Backfill historical credits from quiz_play_log
INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, play_id, notes, created_at)
SELECT user_id, score, 'quiz_score', id, 'Backfill from quiz_play_log', played_at
FROM public.quiz_play_log
WHERE score > 0
ON CONFLICT (play_id) WHERE play_id IS NOT NULL DO NOTHING;

-- 7. Backfill historical debits from non-cancelled withdrawals
INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, withdrawal_id, notes, created_at)
SELECT u.id, -w.amount, 'withdrawal', w.id, 'Backfill from withdrawals', w.created_at
FROM public.withdrawals w
JOIN auth.users u ON lower(u.email) = lower(w.email)
WHERE w.status IN ('pending','completed')
ON CONFLICT (withdrawal_id, reason) WHERE withdrawal_id IS NOT NULL DO NOTHING;
