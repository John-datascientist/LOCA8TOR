CREATE POLICY "No direct read access to device referral aliases"
ON public.device_referral_aliases
FOR SELECT
USING (false);

CREATE POLICY "No direct create access to device referral aliases"
ON public.device_referral_aliases
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct edit access to device referral aliases"
ON public.device_referral_aliases
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct delete access to device referral aliases"
ON public.device_referral_aliases
FOR DELETE
USING (false);