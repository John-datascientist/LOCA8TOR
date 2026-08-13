
-- Security-definer helper that returns true if the current authenticated user
-- has a confirmed email. Avoids relying on user_metadata in RLS.
CREATE OR REPLACE FUNCTION public.current_user_email_verified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email_confirmed_at IS NOT NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_email_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_email_verified() TO authenticated;

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
);
