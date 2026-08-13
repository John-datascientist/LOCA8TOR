
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS business_size text DEFAULT NULL;

ALTER TABLE public.business_riders ADD COLUMN IF NOT EXISTS email text DEFAULT NULL;
ALTER TABLE public.business_riders ADD COLUMN IF NOT EXISTS location text DEFAULT NULL;
ALTER TABLE public.business_riders ADD COLUMN IF NOT EXISTS last_lat double precision DEFAULT NULL;
ALTER TABLE public.business_riders ADD COLUMN IF NOT EXISTS last_lng double precision DEFAULT NULL;
ALTER TABLE public.business_riders ADD COLUMN IF NOT EXISTS last_postcode text DEFAULT NULL;
ALTER TABLE public.business_riders ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT NULL;
ALTER TABLE public.business_riders ADD COLUMN IF NOT EXISTS total_deliveries integer DEFAULT 0;
ALTER TABLE public.business_riders ADD COLUMN IF NOT EXISTS successful_deliveries integer DEFAULT 0;
ALTER TABLE public.business_riders ADD COLUMN IF NOT EXISTS failed_deliveries integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.rider_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_rider_id uuid REFERENCES public.business_riders(id) ON DELETE CASCADE NOT NULL,
  business_user_id uuid NOT NULL,
  customer_name text NOT NULL,
  from_postcode text,
  to_postcode text,
  status text NOT NULL DEFAULT 'delivered',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage delivery logs" ON public.rider_delivery_logs
  FOR ALL TO authenticated
  USING (business_user_id IN (SELECT riders.id FROM riders WHERE riders.user_id = auth.uid()))
  WITH CHECK (business_user_id IN (SELECT riders.id FROM riders WHERE riders.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.rider_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_rider_id uuid REFERENCES public.business_riders(id) ON DELETE CASCADE NOT NULL,
  business_user_id uuid NOT NULL,
  message text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage messages" ON public.rider_messages
  FOR ALL TO authenticated
  USING (business_user_id IN (SELECT riders.id FROM riders WHERE riders.user_id = auth.uid()))
  WITH CHECK (business_user_id IN (SELECT riders.id FROM riders WHERE riders.user_id = auth.uid()));
