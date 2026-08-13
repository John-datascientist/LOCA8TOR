-- 1. Quiz: dedupe rapid double-fire of register_quiz_play
CREATE OR REPLACE FUNCTION public.register_quiz_play(_ip text DEFAULT NULL::text)
RETURNS TABLE(allowed boolean, plays_today integer, plays_remaining integer, play_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- If a play was registered for this user in the last 60 seconds, reuse it.
  -- This prevents double-counting from React StrictMode / double-clicks / rapid retries.
  SELECT id INTO _recent_id
  FROM public.quiz_play_log
  WHERE user_id = _uid AND played_at > now() - interval '60 seconds'
  ORDER BY played_at DESC
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
$function$;

GRANT EXECUTE ON FUNCTION public.register_quiz_play(text) TO authenticated;

-- 2. Admin referral history: include referred user info (email / name / phone / ip)
DROP FUNCTION IF EXISTS public.admin_get_referral_history(text);
CREATE OR REPLACE FUNCTION public.admin_get_referral_history(_referral_code text)
RETURNS TABLE(
  id uuid,
  amount integer,
  trigger_event text,
  referred_device_id text,
  referred_ip text,
  created_at timestamp with time zone,
  referred_email text,
  referred_name text,
  referred_phone text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.amount,
    c.trigger_event,
    c.referred_device_id,
    c.referred_ip,
    c.created_at,
    u.email::text AS referred_email,
    COALESCE(r.full_name, u.raw_user_meta_data->>'full_name') AS referred_name,
    r.phone AS referred_phone
  FROM public.device_referral_claims c
  LEFT JOIN public.user_referral_balances urb
    ON urb.migrated_from_device_id = c.referred_device_id
  LEFT JOIN auth.users u ON u.id = urb.user_id
  LEFT JOIN public.riders r ON r.user_id = u.id
  WHERE c.referrer_code = _referral_code
  ORDER BY c.created_at DESC
  LIMIT 500;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_referral_history(text) TO authenticated;
