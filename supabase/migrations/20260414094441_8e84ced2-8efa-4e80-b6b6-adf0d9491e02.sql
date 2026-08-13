
CREATE TABLE public.allowed_countries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.allowed_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read allowed countries"
ON public.allowed_countries FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert allowed countries"
ON public.allowed_countries FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete allowed countries"
ON public.allowed_countries FOR DELETE TO authenticated
USING (true);

INSERT INTO public.allowed_countries (country_code, country_name) VALUES
  ('NG', 'Nigeria'),
  ('GB', 'United Kingdom'),
  ('CA', 'Canada'),
  ('US', 'United States');
