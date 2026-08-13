
-- Table for rider join requests to businesses
CREATE TABLE public.rider_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rider_id, business_id)
);

ALTER TABLE public.rider_join_requests ENABLE ROW LEVEL SECURITY;

-- Riders can see their own requests
CREATE POLICY "Riders can see own join requests"
ON public.rider_join_requests FOR SELECT TO authenticated
USING (
  rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid())
  OR business_id IN (SELECT id FROM riders WHERE user_id = auth.uid())
);

-- Riders can create join requests
CREATE POLICY "Riders can create join requests"
ON public.rider_join_requests FOR INSERT TO authenticated
WITH CHECK (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));

-- Business owners can update (accept/reject) requests
CREATE POLICY "Business owners can update join requests"
ON public.rider_join_requests FOR UPDATE TO authenticated
USING (business_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));

-- Riders can delete their own pending requests
CREATE POLICY "Riders can delete own requests"
ON public.rider_join_requests FOR DELETE TO authenticated
USING (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()) AND status = 'pending');

-- Add linked_rider_id to business_riders to link to actual rider accounts
ALTER TABLE public.business_riders ADD COLUMN linked_rider_id uuid REFERENCES public.riders(id) ON DELETE SET NULL;

-- Add business_code to riders for businesses (used by riders to find/join a business)
ALTER TABLE public.riders ADD COLUMN business_code text UNIQUE;
