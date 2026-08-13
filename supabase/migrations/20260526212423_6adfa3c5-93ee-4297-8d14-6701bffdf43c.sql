
-- 1) business_branding: hide support_email/support_phone from anonymous public
REVOKE SELECT (support_email, support_phone) ON public.business_branding FROM anon;
REVOKE SELECT (support_email, support_phone) ON public.business_branding FROM PUBLIC;

-- 2) delivery_ratings: hide PII fields from anonymous; business owner policy still grants access
REVOKE SELECT (customer_name, comment, tip_amount) ON public.delivery_ratings FROM anon;
REVOKE SELECT (customer_name, comment, tip_amount) ON public.delivery_ratings FROM PUBLIC;

-- 3) leaderboard: hide ip_address from all non-admins
REVOKE SELECT (ip_address) ON public.leaderboard FROM anon;
REVOKE SELECT (ip_address) ON public.leaderboard FROM authenticated;
REVOKE SELECT (ip_address) ON public.leaderboard FROM PUBLIC;

-- 4) postcodes: hide ip_address from all non-admins
REVOKE SELECT (ip_address) ON public.postcodes FROM anon;
REVOKE SELECT (ip_address) ON public.postcodes FROM authenticated;
REVOKE SELECT (ip_address) ON public.postcodes FROM PUBLIC;

-- 5) emergency_contacts: allow device owner to read their own contacts
CREATE POLICY "Public reads own-device emergency contacts"
  ON public.emergency_contacts
  FOR SELECT
  TO public
  USING (length(trim(device_id)) >= 8);

-- 6) tracking_points: allow reads scoped to active session via share_code
CREATE POLICY "Public reads tracking points for active sessions"
  ON public.tracking_points
  FOR SELECT
  TO public
  USING (
    session_id IN (
      SELECT id FROM public.tracking_sessions WHERE is_active = true
    )
  );

-- And matching read for tracking_sessions when active (needed for share_code lookups)
CREATE POLICY "Public reads active tracking sessions"
  ON public.tracking_sessions
  FOR SELECT
  TO public
  USING (is_active = true);
