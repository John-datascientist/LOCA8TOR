
CREATE OR REPLACE FUNCTION public.get_rider_details(rider_ids uuid[])
RETURNS TABLE(id uuid, full_name text, phone text, location text, postcode text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT r.id, r.full_name, r.phone, r.location, r.postcode
  FROM public.riders r
  WHERE r.id = ANY(rider_ids);
$$;
