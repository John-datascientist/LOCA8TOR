CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('airtime', 'data')),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  network_provider text NOT NULL,
  state_of_residence text NOT NULL,
  address text NOT NULL,
  postcode text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert withdrawals" ON public.withdrawals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read withdrawals" ON public.withdrawals FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update withdrawals" ON public.withdrawals FOR UPDATE TO public USING (true);