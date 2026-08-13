-- 1) business_branding: hide support contact fields from anon
REVOKE SELECT (support_email, support_phone) ON public.business_branding FROM anon;

-- 2) delivery_ratings: hide customer PII from anon
REVOKE SELECT (customer_name, comment, tip_amount) ON public.delivery_ratings FROM anon;

-- 3) leaderboard: hide ip_address from anon
REVOKE SELECT (ip_address) ON public.leaderboard FROM anon;

-- 4) postcodes: hide ip_address from anon (admin reads as authenticated)
REVOKE SELECT (ip_address) ON public.postcodes FROM anon;
REVOKE SELECT (ip_address) ON public.postcodes FROM authenticated;
GRANT SELECT (ip_address) ON public.postcodes TO service_role;

-- Allow authenticated super-admins (and any authenticated reader the RLS allows) via a definer RPC instead.
-- Helper for the public quiz to enforce per-IP daily cap without exposing ip_address
CREATE OR REPLACE FUNCTION public.get_ip_quiz_total_24h(_ip text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(score), 0)::numeric
  FROM public.leaderboard
  WHERE ip_address = _ip
    AND created_at >= now() - interval '24 hours';
$$;
GRANT EXECUTE ON FUNCTION public.get_ip_quiz_total_24h(text) TO anon, authenticated;

-- Helper for admin postcode IP stats (super-admin only)
CREATE OR REPLACE FUNCTION public.admin_get_postcode_ip_stats(_limit integer DEFAULT 1000)
RETURNS TABLE(state text, lga text, ip_address text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin((auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT p.state, p.lga, p.ip_address
    FROM public.postcodes p
    ORDER BY p.created_at DESC
    LIMIT _limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_postcode_ip_stats(integer) TO authenticated;

-- 5) tracking_sessions: drop the unsafe anonymous UPDATE policy
DROP POLICY IF EXISTS "Public updates tracking sessions with device" ON public.tracking_sessions;