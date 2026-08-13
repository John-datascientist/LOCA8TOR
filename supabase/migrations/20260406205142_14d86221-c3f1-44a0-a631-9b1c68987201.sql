
-- Add bike_owner column to riders table
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS bike_owner text DEFAULT 'self';

-- Add subscription_status to riders for paywall
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';

-- RLS: Allow linked riders to read messages sent to them
CREATE POLICY "Linked riders can read their messages"
ON public.rider_messages
FOR SELECT
TO authenticated
USING (
  business_rider_id IN (
    SELECT br.id FROM public.business_riders br
    WHERE br.linked_rider_id IN (
      SELECT r.id FROM public.riders r WHERE r.user_id = auth.uid()
    )
  )
);

-- RLS: Allow linked riders to insert reply messages
CREATE POLICY "Linked riders can send reply messages"
ON public.rider_messages
FOR INSERT
TO authenticated
WITH CHECK (
  direction = 'inbound' AND
  business_rider_id IN (
    SELECT br.id FROM public.business_riders br
    WHERE br.linked_rider_id IN (
      SELECT r.id FROM public.riders r WHERE r.user_id = auth.uid()
    )
  )
);
