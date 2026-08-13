ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;