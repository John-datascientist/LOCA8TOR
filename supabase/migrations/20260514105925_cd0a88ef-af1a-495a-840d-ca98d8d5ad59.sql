CREATE UNIQUE INDEX IF NOT EXISTS riders_phone_unique_idx
ON public.riders ((NULLIF(TRIM(phone), '')));