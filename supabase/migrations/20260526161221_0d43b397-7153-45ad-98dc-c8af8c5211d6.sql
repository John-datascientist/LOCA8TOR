-- Relax withdrawal insert policy: don't gate on quiz_play_log balance,
-- since legacy plays are not all logged and admins manually review every
-- payout. Keep the amount range and email/verification checks.
DROP POLICY IF EXISTS "Verified users insert own withdrawals" ON public.withdrawals;

CREATE POLICY "Verified users insert own withdrawals"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND lower(email) = lower((auth.jwt() ->> 'email'::text))
  AND current_user_email_verified()
  AND amount >= 50
  AND amount <= 100000
  AND length(trim(full_name)) > 0
  AND length(trim(phone)) >= 10
  AND length(trim(email)) > 3
  AND type = ANY (ARRAY['airtime'::text, 'data'::text])
);