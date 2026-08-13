CREATE POLICY "Linked riders can read their own business rider record"
ON public.business_riders
FOR SELECT
TO authenticated
USING (
  linked_rider_id IN (
    SELECT r.id
    FROM public.riders r
    WHERE r.user_id = auth.uid()
  )
);