
CREATE TABLE IF NOT EXISTS public.business_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  amount numeric NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'delivery_fee',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.business_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their earnings" ON public.business_earnings
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));
