
-- ============================================================
-- PACK 1: COD + Failed delivery reasons + Signature capture
-- ============================================================
ALTER TABLE public.delivery_trackings
  ADD COLUMN IF NOT EXISTS cod_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_collected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS cod_settled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_amount numeric DEFAULT 0;

ALTER TABLE public.rider_delivery_logs
  ADD COLUMN IF NOT EXISTS cod_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_collected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS signature_data text;

-- ============================================================
-- PACK 2: Customer ratings + Branded tracking + Tips
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL,
  business_user_id uuid NOT NULL,
  business_rider_id uuid,
  share_code text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  tip_amount numeric DEFAULT 0,
  customer_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_business ON public.delivery_ratings(business_user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_rider ON public.delivery_ratings(business_rider_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_ratings_share ON public.delivery_ratings(share_code);

ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit ratings via share_code"
  ON public.delivery_ratings FOR INSERT TO public
  WITH CHECK (length(trim(share_code)) > 0 AND rating BETWEEN 1 AND 5);

CREATE POLICY "Public can read ratings"
  ON public.delivery_ratings FOR SELECT TO public USING (true);

CREATE POLICY "Business owners can manage their ratings"
  ON public.delivery_ratings FOR ALL TO authenticated
  USING (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
  WITH CHECK (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Business branding (logo, color, support phone) for branded tracking page
CREATE TABLE IF NOT EXISTS public.business_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL UNIQUE,
  brand_name text,
  brand_color text DEFAULT '#B8F53A',
  logo_url text,
  support_phone text,
  support_email text,
  tagline text,
  show_tip_jar boolean DEFAULT true,
  show_rating boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read branding"
  ON public.business_branding FOR SELECT TO public USING (true);

CREATE POLICY "Business owners manage own branding"
  ON public.business_branding FOR ALL TO authenticated
  USING (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
  WITH CHECK (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- ============================================================
-- PACK 3: Delivery zones + Auto-assign config
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL,
  name text NOT NULL,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  radius_km numeric NOT NULL DEFAULT 5,
  base_fee numeric NOT NULL DEFAULT 0,
  per_km_fee numeric NOT NULL DEFAULT 0,
  surge_multiplier numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active zones"
  ON public.delivery_zones FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Business owners manage own zones"
  ON public.delivery_zones FOR ALL TO authenticated
  USING (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
  WITH CHECK (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Auto-assign settings on the riders (business) row
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS auto_assign_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_assign_radius_km numeric DEFAULT 10;
