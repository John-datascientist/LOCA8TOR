CREATE POLICY "Linked riders can update their delivery logs"
ON public.rider_delivery_logs FOR UPDATE
TO authenticated
USING (business_rider_id IN (
  SELECT br.id FROM business_riders br
  WHERE br.linked_rider_id IN (
    SELECT r.id FROM riders r WHERE r.user_id = auth.uid()
  )
));