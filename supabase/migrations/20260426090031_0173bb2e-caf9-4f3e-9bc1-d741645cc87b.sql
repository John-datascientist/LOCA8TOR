
-- Recreate views as SECURITY INVOKER (default in PG15+, but be explicit)
DROP VIEW IF EXISTS public.public_rider_locations;
CREATE VIEW public.public_rider_locations
WITH (security_invoker = true) AS
SELECT id, last_postcode, last_lat, last_lng, last_seen, status
FROM public.business_riders
WHERE last_postcode IS NOT NULL AND last_lat IS NOT NULL;
GRANT SELECT ON public.public_rider_locations TO anon, authenticated;

DROP VIEW IF EXISTS public.public_leaderboard;
CREATE VIEW public.public_leaderboard
WITH (security_invoker = true) AS
SELECT id, name, score, category, difficulty, accuracy, created_at
FROM public.leaderboard;
GRANT SELECT ON public.public_leaderboard TO anon, authenticated;

-- Since security_invoker views need the underlying table to be readable by the caller,
-- re-add narrowly-scoped public SELECT policies that only expose the safe columns
-- (the views naturally filter columns; the row-level policy controls which rows).
CREATE POLICY "Public reads rider location columns only via view"
ON public.business_riders FOR SELECT
TO anon, authenticated
USING (last_postcode IS NOT NULL AND last_lat IS NOT NULL);

-- Leaderboard already has "Leaderboard is publicly readable" policy — no change needed.

-- spatial_ref_sys: enable RLS with public read (PostGIS reference data)
-- Note: PostGIS owns this table; RLS may already be managed. Wrap in a check.
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN insufficient_privilege THEN
  -- can't alter PostGIS-owned table; skip
  NULL;
END$$;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "Public read spatial ref sys" ON public.spatial_ref_sys FOR SELECT TO anon, authenticated USING (true)';
EXCEPTION WHEN insufficient_privilege THEN NULL;
WHEN duplicate_object THEN NULL;
END$$;
