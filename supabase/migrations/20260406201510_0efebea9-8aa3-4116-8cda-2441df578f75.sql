
-- Add postcode and cac_number columns to riders
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS cac_number text;

-- Create a security definer function to search businesses by code or phone
-- This bypasses RLS so riders can find businesses to join
CREATE OR REPLACE FUNCTION public.search_business(search_term text)
RETURNS TABLE(id uuid, business_name text, business_size text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.business_name, r.business_size, r.full_name
  FROM public.riders r
  WHERE r.account_type = 'business'
    AND (r.business_code = search_term OR r.phone = search_term)
  LIMIT 1;
$$;
