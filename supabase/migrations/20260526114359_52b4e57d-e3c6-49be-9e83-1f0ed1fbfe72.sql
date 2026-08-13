
-- 1. Hide business support email/phone from public/anon readers.
--    Authenticated users still see them (business owners need to manage their own).
REVOKE SELECT (support_email, support_phone) ON public.business_branding FROM anon;

-- 2. Remove the overly-broad public read policy on business_riders that
--    exposed rider phone/email/name/stats alongside coordinates.
DROP POLICY IF EXISTS "Public reads rider location columns only via view" ON public.business_riders;

-- 3. Hide IP addresses on publicly readable tables.
REVOKE SELECT (ip_address) ON public.leaderboard FROM anon, authenticated;
REVOKE SELECT (ip_address) ON public.postcodes  FROM anon, authenticated;

-- 4. Pin search_path on the remaining app-owned functions that were flagged
--    by the database linter (PGMQ helpers).
ALTER FUNCTION public.delete_email(text, bigint)            SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb)            SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
