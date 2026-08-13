CREATE POLICY "Linked riders can read their delivery logs"
ON public.rider_delivery_logs
FOR SELECT
TO authenticated
USING (
  business_rider_id IN (
    SELECT br.id
    FROM public.business_riders br
    WHERE br.linked_rider_id IN (
      SELECT r.id
      FROM public.riders r
      WHERE r.user_id = auth.uid()
    )
  )
);