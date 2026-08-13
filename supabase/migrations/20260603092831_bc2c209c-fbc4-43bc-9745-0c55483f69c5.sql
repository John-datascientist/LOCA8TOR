CREATE OR REPLACE FUNCTION public.expire_old_quiz_credits(_uid uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quiz earnings do not expire. This function is retained as a safe no-op
  -- because balance and withdrawal functions call it before reading totals.
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_quiz_play(_ip text DEFAULT NULL::text)
RETURNS TABLE(allowed boolean, plays_today integer, plays_remaining integer, play_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _count integer;
  _new_id uuid;
  _recent_id uuid;
  _daily_limit integer := 2;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  -- Reuse only an uncredited play created a few seconds ago. This protects
  -- against double-clicks without letting a finished quiz reuse the same play_id
  -- and silently drop the next game's credit.
  SELECT q.id INTO _recent_id
  FROM public.quiz_play_log q
  WHERE q.user_id = _uid
    AND q.played_at > now() - interval '10 seconds'
    AND q.score = 0
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_balance_ledger l WHERE l.play_id = q.id
    )
  ORDER BY q.played_at DESC
  LIMIT 1;

  SELECT COUNT(*) INTO _count
  FROM public.quiz_play_log
  WHERE user_id = _uid AND play_date = _today;

  IF _recent_id IS NOT NULL THEN
    RETURN QUERY SELECT true, _count, GREATEST(0, _daily_limit - _count), _recent_id;
    RETURN;
  END IF;

  IF _count >= _daily_limit THEN
    RETURN QUERY SELECT false, _count, 0, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.quiz_play_log (user_id, ip_address, play_date)
  VALUES (_uid, _ip, _today)
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT true, _count + 1, GREATEST(0, _daily_limit - (_count + 1)), _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_quiz_score(_play_id uuid, _score integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _safe integer := GREATEST(0, LEAST(COALESCE(_score, 0), 100));
  _current integer;
  _final integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT score INTO _current
  FROM public.quiz_play_log
  WHERE id = _play_id AND user_id = _uid;

  IF _current IS NULL THEN
    RAISE EXCEPTION 'Quiz play not found for this user';
  END IF;

  _final := GREATEST(COALESCE(_current, 0), _safe);

  UPDATE public.quiz_play_log
  SET score = _final
  WHERE id = _play_id AND user_id = _uid;

  INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, play_id)
  VALUES (_uid, _final, 'quiz_score', _play_id)
  ON CONFLICT (play_id) WHERE play_id IS NOT NULL DO UPDATE
  SET amount = GREATEST(public.quiz_balance_ledger.amount, EXCLUDED.amount),
      notes = CASE
        WHEN public.quiz_balance_ledger.amount < EXCLUDED.amount
        THEN 'Auto-reconciled quiz score'
        ELSE public.quiz_balance_ledger.notes
      END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_balance()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.available_quiz_balance(_uid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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