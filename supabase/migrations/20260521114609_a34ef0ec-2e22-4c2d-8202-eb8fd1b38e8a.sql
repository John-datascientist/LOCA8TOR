
-- 1. Strengthen the rider-insert ban trigger: include banned EMAIL (via auth.users)
--    and use normalized phone matching.
CREATE OR REPLACE FUNCTION public.riders_block_banned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_phone_key text := public.normalize_phone_key(NEW.phone);
BEGIN
  -- Resolve email from auth.users for this user_id
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.user_id;

  IF v_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.banned_identifiers
    WHERE kind = 'email' AND lower(value) = v_email
  ) THEN
    RAISE EXCEPTION 'This email is blocked from creating new accounts.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_phone_key <> '' AND EXISTS (
    SELECT 1 FROM public.banned_identifiers
    WHERE kind = 'phone' AND public.normalize_phone_key(value) = v_phone_key
  ) THEN
    RAISE EXCEPTION 'This phone number is blocked from creating new accounts.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.signup_ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.banned_identifiers
    WHERE kind = 'ip' AND value = NEW.signup_ip
  ) THEN
    RAISE EXCEPTION 'This network is blocked from creating new accounts.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_riders_block_banned ON public.riders;
CREATE TRIGGER trg_riders_block_banned
  BEFORE INSERT ON public.riders
  FOR EACH ROW EXECUTE FUNCTION public.riders_block_banned();

-- 2. Server-computed quiz balance: sum of recorded quiz scores minus existing withdrawals.
CREATE OR REPLACE FUNCTION public.available_quiz_balance(_uid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH earned AS (
    SELECT COALESCE(SUM(score), 0)::int AS s
    FROM public.quiz_play_log
    WHERE user_id = _uid
  ),
  user_email AS (
    SELECT lower(email) AS e FROM auth.users WHERE id = _uid
  ),
  spent AS (
    SELECT COALESCE(SUM(amount), 0)::int AS s
    FROM public.withdrawals w, user_email u
    WHERE lower(w.email) = u.e
      AND w.status IN ('pending', 'completed', 'approved')
  )
  SELECT GREATEST(0, (SELECT s FROM earned) - (SELECT s FROM spent));
$$;

REVOKE EXECUTE ON FUNCTION public.available_quiz_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.available_quiz_balance(uuid) TO authenticated;

-- 3. Update withdrawal insert policy to enforce that amount fits the user's true earned balance.
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
);
