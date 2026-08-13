-- Backfill migration: coordinate_postcode_cache and its two RPC functions
-- (upsert_coordinate_postcode_cache, get_coordinate_postcode_cache) were
-- created directly on the original project without ever being captured as
-- a migration, so a fresh database (built from this migration history
-- alone) fails at 20260422112726, which only adds RLS policies assuming
-- this table already exists. Reconstructed from how the client actually
-- calls these (src/lib/postcodeGenerator.ts: writeCoordinateCache /
-- generatePostcodeWithAddress's non-Nigeria coordinate cache lookup).
-- Timestamped one second before that migration so it applies first.

CREATE TABLE IF NOT EXISTS public.coordinate_postcode_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  postcode text NOT NULL,
  state text,
  address text,
  area text,
  road text,
  lga text,
  country text,
  is_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, lat, lng)
);

CREATE INDEX IF NOT EXISTS idx_coordinate_postcode_cache_lookup
  ON public.coordinate_postcode_cache (country_code, lat, lng);

ALTER TABLE public.coordinate_postcode_cache ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.upsert_coordinate_postcode_cache(
  _country_code text,
  _lat double precision,
  _lng double precision,
  _postcode text,
  _state text,
  _address text,
  _area text,
  _road text,
  _lga text,
  _country text,
  _is_generated boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  INSERT INTO public.coordinate_postcode_cache (
    country_code, lat, lng, postcode, state, address, area, road, lga, country, is_generated
  ) VALUES (
    _country_code, _lat, _lng, _postcode, _state, _address, _area, _road, _lga, _country, _is_generated
  )
  ON CONFLICT (country_code, lat, lng) DO UPDATE SET
    postcode = EXCLUDED.postcode,
    state = EXCLUDED.state,
    address = EXCLUDED.address,
    area = EXCLUDED.area,
    road = EXCLUDED.road,
    lga = EXCLUDED.lga,
    country = EXCLUDED.country,
    is_generated = EXCLUDED.is_generated,
    updated_at = now();
$$;

CREATE OR REPLACE FUNCTION public.get_coordinate_postcode_cache(
  _country_code text,
  _lat double precision,
  _lng double precision
)
RETURNS TABLE (
  postcode text,
  state text,
  address text,
  area text,
  road text,
  lga text,
  country text,
  is_generated boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT postcode, state, address, area, road, lga, country, is_generated
  FROM public.coordinate_postcode_cache
  WHERE country_code = _country_code AND lat = _lat AND lng = _lng
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_coordinate_postcode_cache(text, double precision, double precision, text, text, text, text, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coordinate_postcode_cache(text, double precision, double precision) TO anon, authenticated;
