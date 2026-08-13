CREATE TABLE IF NOT EXISTS public.quiz_play_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  score integer NOT NULL DEFAULT 0,
  played_at timestamptz NOT NULL DEFAULT now(),
  play_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date
);

CREATE INDEX IF NOT EXISTS quiz_play_log_user_date_idx
  ON public.quiz_play_log (user_id, play_date);

ALTER TABLE public.quiz_play_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own quiz plays" ON public.quiz_play_log;
CREATE POLICY "Users read own quiz plays"
  ON public.quiz_play_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins read all quiz plays" ON public.quiz_play_log;
CREATE POLICY "Super admins read all quiz plays"
  ON public.quiz_play_log FOR SELECT TO authenticated
  USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- Inserts/updates only via SECURITY DEFINER functions below

CREATE OR REPLACE FUNCTION public.register_quiz_play(_ip text DEFAULT NULL)
RETURNS TABLE(allowed boolean, plays_today integer, plays_remaining integer, play_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _count integer;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT COUNT(*) INTO _count
  FROM public.quiz_play_log
  WHERE user_id = _uid AND play_date = _today;

  IF _count >= 3 THEN
    RETURN QUERY SELECT false, _count, 0, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.quiz_play_log (user_id, ip_address, play_date)
  VALUES (_uid, _ip, _today)
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT true, _count + 1, GREATEST(0, 3 - (_count + 1)), _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_quiz_score(_play_id uuid, _score integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  UPDATE public.quiz_play_log
  SET score = GREATEST(0, _score)
  WHERE id = _play_id AND user_id = _uid;
END;
$$;