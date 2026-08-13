
CREATE TABLE public.delivery_trackings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_rider_id uuid NOT NULL REFERENCES public.business_riders(id) ON DELETE CASCADE,
  business_user_id uuid NOT NULL,
  share_code text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text,
  from_postcode text,
  to_postcode text,
  status text NOT NULL DEFAULT 'pending',
  rider_name text,
  rider_phone text,
  last_lat double precision,
  last_lng double precision,
  last_postcode text,
  notes text,
  estimated_delivery text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_trackings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read delivery trackings by share code"
ON public.delivery_trackings FOR SELECT TO public
USING (true);

CREATE POLICY "Business owners can manage delivery trackings"
ON public.delivery_trackings FOR ALL TO authenticated
USING (business_user_id IN (SELECT riders.id FROM riders WHERE riders.user_id = auth.uid()))
WITH CHECK (business_user_id IN (SELECT riders.id FROM riders WHERE riders.user_id = auth.uid()));
