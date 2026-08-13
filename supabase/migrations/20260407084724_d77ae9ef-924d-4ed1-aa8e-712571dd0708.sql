
-- Allow public to read business_riders for postcode search (only location fields)
CREATE POLICY "Anyone can read rider location by postcode"
ON public.business_riders FOR SELECT TO public
USING (last_postcode IS NOT NULL AND last_lat IS NOT NULL);
