
-- 1. Allow 'cancelled' status (client already tries to set it)
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check;
ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text]));

-- 2. Fix the insert policy — email_verified lives in user_metadata, not top-level claim
DROP POLICY IF EXISTS "Verified users insert own withdrawals" ON public.withdrawals;

CREATE POLICY "Verified users insert own withdrawals"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND lower(email) = lower((auth.jwt() ->> 'email'))
  AND (
    COALESCE((auth.jwt() ->> 'email_verified')::boolean, false) = true
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, false) = true
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'email_verified')::boolean, false) = true
  )
  AND amount >= 50
  AND amount <= 100000
  AND length(trim(full_name)) > 0
  AND length(trim(phone)) >= 10
  AND length(trim(email)) > 3
  AND type = ANY (ARRAY['airtime'::text, 'data'::text])
);

-- 3. Let users cancel their own pending withdrawal
DROP POLICY IF EXISTS "Users cancel own pending withdrawals" ON public.withdrawals;
CREATE POLICY "Users cancel own pending withdrawals"
ON public.withdrawals
FOR UPDATE
TO authenticated
USING (
  lower(email) = lower((auth.jwt() ->> 'email'))
  AND status = 'pending'
)
WITH CHECK (
  lower(email) = lower((auth.jwt() ->> 'email'))
  AND status = 'cancelled'
);
