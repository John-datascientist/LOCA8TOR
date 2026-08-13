
-- Allow linked riders to read their assigned delivery trackings
CREATE POLICY "Linked riders can read their delivery trackings"
ON public.delivery_trackings
FOR SELECT
TO authenticated
USING (
  business_rider_id IN (
    SELECT br.id FROM business_riders br
    WHERE br.linked_rider_id IN (
      SELECT r.id FROM riders r WHERE r.user_id = auth.uid()
    )
  )
);

-- Allow linked riders to update delivery tracking status (accept, pick up, deliver)
CREATE POLICY "Linked riders can update their delivery trackings"
ON public.delivery_trackings
FOR UPDATE
TO authenticated
USING (
  business_rider_id IN (
    SELECT br.id FROM business_riders br
    WHERE br.linked_rider_id IN (
      SELECT r.id FROM riders r WHERE r.user_id = auth.uid()
    )
  )
);

-- Allow linked riders to update their own business_riders record (for location updates)
CREATE POLICY "Linked riders can update their own record"
ON public.business_riders
FOR UPDATE
TO authenticated
USING (
  linked_rider_id IN (
    SELECT r.id FROM riders r WHERE r.user_id = auth.uid()
  )
);
