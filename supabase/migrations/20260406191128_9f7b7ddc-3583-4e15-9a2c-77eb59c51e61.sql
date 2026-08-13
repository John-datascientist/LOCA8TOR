
-- Riders profile table
CREATE TABLE public.riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'business')),
  business_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Business riders (riders added by a business account)
CREATE TABLE public.business_riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_user_id UUID REFERENCES public.riders(id) ON DELETE CASCADE NOT NULL,
  rider_name TEXT NOT NULL,
  rider_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_riders ENABLE ROW LEVEL SECURITY;

-- Riders: users can only manage their own profile
CREATE POLICY "Users can read own rider profile" ON public.riders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rider profile" ON public.riders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rider profile" ON public.riders FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Business riders: business owners can manage their riders
CREATE POLICY "Business owners can read their riders" ON public.business_riders FOR SELECT TO authenticated USING (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));
CREATE POLICY "Business owners can insert riders" ON public.business_riders FOR INSERT TO authenticated WITH CHECK (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));
CREATE POLICY "Business owners can update riders" ON public.business_riders FOR UPDATE TO authenticated USING (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));
CREATE POLICY "Business owners can delete riders" ON public.business_riders FOR DELETE TO authenticated USING (business_user_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Coord-based postcode lookup index for stability
CREATE INDEX IF NOT EXISTS idx_postcodes_lat_lng ON public.postcodes (lat, lng);
