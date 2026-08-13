
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create properties table
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_lat double precision NOT NULL,
  raw_lng double precision NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  postcode text NOT NULL UNIQUE,
  state_name text,
  lga_name text,
  state_number int,
  lga_number int,
  ward_number int,
  address text,
  location geography(Point, 4326),
  created_at timestamptz DEFAULT now()
);

-- Spatial index
CREATE INDEX idx_properties_location ON public.properties USING GIST (location);
CREATE INDEX idx_properties_postcode ON public.properties (postcode);
CREATE INDEX idx_properties_coords ON public.properties (lat, lng);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read properties"
ON public.properties FOR SELECT TO public
USING (true);

CREATE POLICY "Anyone can insert properties"
ON public.properties FOR INSERT TO public
WITH CHECK (true);

-- Admin can update/delete (authenticated)
CREATE POLICY "Authenticated users can update properties"
ON public.properties FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete properties"
ON public.properties FOR DELETE TO authenticated
USING (true);

-- Function: find nearby property within radius
CREATE OR REPLACE FUNCTION public.find_nearby_property(
  user_lat double precision,
  user_lng double precision,
  radius_meters double precision DEFAULT 15
)
RETURNS TABLE(id uuid, postcode text, lat double precision, lng double precision, state_name text, lga_name text, address text, distance_meters double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id, p.postcode, p.lat, p.lng, p.state_name, p.lga_name, p.address,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) AS distance_meters
  FROM public.properties p
  WHERE ST_DWithin(
    p.location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters ASC
  LIMIT 1;
$$;
