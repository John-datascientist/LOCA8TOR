-- Create postcodes table for shared postcode database
CREATE TABLE public.postcodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  postcode TEXT NOT NULL,
  address TEXT,
  state TEXT NOT NULL,
  country TEXT,
  lga TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_postcodes_postcode ON public.postcodes (postcode);
CREATE INDEX idx_postcodes_state ON public.postcodes (state);

ALTER TABLE public.postcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Postcodes are publicly readable"
  ON public.postcodes FOR SELECT USING (true);

CREATE POLICY "Anyone can insert postcodes"
  ON public.postcodes FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update postcodes"
  ON public.postcodes FOR UPDATE USING (true);