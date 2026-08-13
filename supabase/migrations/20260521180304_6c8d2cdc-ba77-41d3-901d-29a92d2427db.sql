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
  _daily_limit integer := 2;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT COUNT(*) INTO _count
  FROM public.quiz_play_log
  WHERE user_id = _uid AND play_date = _today;

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

GRANT EXECUTE ON FUNCTION public.register_quiz_play(text) TO authenticated;