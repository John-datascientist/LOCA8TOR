
-- Restrict withdrawals to authenticated users with verified emails,
-- and require the row email to match the JWT email (each payout linked to a signup).
DROP POLICY IF EXISTS "Public inserts valid withdrawals" ON public.withdrawals;

CREATE POLICY "Verified users insert own withdrawals"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND lower(email) = lower((auth.jwt() ->> 'email'))
  AND COALESCE((auth.jwt() ->> 'email_verified')::boolean, false) = true
  AND amount >= 50
  AND amount <= 100000
  AND length(trim(full_name)) > 0
  AND length(trim(phone)) >= 10
  AND length(trim(email)) > 3
  AND type = ANY (ARRAY['airtime'::text, 'data'::text])
);
