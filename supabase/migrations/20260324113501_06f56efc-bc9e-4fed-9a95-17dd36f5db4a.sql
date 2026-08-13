
-- Add ip_address column to postcodes
ALTER TABLE public.postcodes ADD COLUMN IF NOT EXISTS ip_address text;

-- Add ip_address column to withdrawals
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS ip_address text;

-- Create leaderboard table
CREATE TABLE public.leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  category text NOT NULL,
  difficulty text NOT NULL DEFAULT 'Mixed',
  accuracy integer NOT NULL DEFAULT 0,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Leaderboard is publicly readable" ON public.leaderboard FOR SELECT TO public USING (true);

-- Public insert
CREATE POLICY "Anyone can insert leaderboard" ON public.leaderboard FOR INSERT TO public WITH CHECK (true);

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard;
