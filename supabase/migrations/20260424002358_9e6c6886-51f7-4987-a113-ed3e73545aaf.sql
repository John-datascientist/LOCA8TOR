-- Cross-device postcode history for signed-in users.
-- Tracks both generated and searched postcodes so users can access their
-- recent locations from any device after signing in.
CREATE TABLE public.postcode_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  postcode text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  address text,
  state text,
  country text,
  lga text,
  source text NOT NULL DEFAULT 'generate', -- 'generate' | 'search'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_postcode_history_user_created
  ON public.postcode_history (user_id, created_at DESC);

-- Prevent duplicate consecutive entries for the same postcode per user.
CREATE UNIQUE INDEX idx_postcode_history_user_postcode
  ON public.postcode_history (user_id, postcode);

ALTER TABLE public.postcode_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own postcode history"
ON public.postcode_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own postcode history"
ON public.postcode_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own postcode history"
ON public.postcode_history
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own postcode history"
ON public.postcode_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);