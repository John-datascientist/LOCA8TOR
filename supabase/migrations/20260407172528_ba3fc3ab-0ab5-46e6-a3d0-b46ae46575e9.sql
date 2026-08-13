
-- Add unique constraints on email (user_id is already unique via auth)
-- We use the riders table phone column for uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS riders_phone_unique ON public.riders (phone);
CREATE UNIQUE INDEX IF NOT EXISTS riders_user_id_unique ON public.riders (user_id);

-- Create platform_stats table to track overall platform metrics
CREATE TABLE IF NOT EXISTS public.platform_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key text NOT NULL UNIQUE,
  stat_value bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform stats" ON public.platform_stats
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can update platform stats" ON public.platform_stats
  FOR UPDATE TO authenticated USING (true);

-- Seed initial stats rows
INSERT INTO public.platform_stats (stat_key, stat_value) VALUES
  ('total_riders', COALESCE((SELECT COUNT(*) FROM public.riders WHERE account_type = 'individual'), 0)),
  ('total_businesses', COALESCE((SELECT COUNT(*) FROM public.riders WHERE account_type = 'business'), 0)),
  ('total_postcodes', COALESCE((SELECT COUNT(*) FROM public.postcodes), 0))
ON CONFLICT (stat_key) DO NOTHING;

-- Create function to auto-increment stats
CREATE OR REPLACE FUNCTION public.increment_platform_stat(key text, amount bigint DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.platform_stats
  SET stat_value = stat_value + amount, updated_at = now()
  WHERE stat_key = key;
$$;
