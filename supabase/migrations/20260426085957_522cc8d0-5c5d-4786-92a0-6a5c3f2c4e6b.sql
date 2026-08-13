
-- =========================================================
-- 1. ADMIN_STAFF — remove public read of PINs and emails
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read admin staff" ON public.admin_staff;

CREATE POLICY "Super admins read admin staff"
ON public.admin_staff FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- Keep "Update last login by matching pin row" but tighten — only allow updating last_login_at column via a definer fn later.
-- For now restrict the existing UPDATE policy more tightly so other columns can't be changed by unauth users.
DROP POLICY IF EXISTS "Update last login by matching pin row" ON public.admin_staff;

-- Definer function for safe last_login bump after PIN auth
CREATE OR REPLACE FUNCTION public.admin_staff_touch_last_login(_email text, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.admin_staff
  WHERE email = _email AND pin = _pin AND is_active = true
  LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE public.admin_staff SET last_login_at = now() WHERE id = v_id;
  RETURN true;
END;
$$;

-- =========================================================
-- 2. WITHDRAWALS — remove public read
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read withdrawals" ON public.withdrawals;

CREATE POLICY "Super admins read withdrawals"
ON public.withdrawals FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

CREATE POLICY "Users read their own withdrawals by email"
ON public.withdrawals FOR SELECT
TO authenticated
USING (lower(email) = lower((auth.jwt() ->> 'email')));

-- =========================================================
-- 3. DELIVERY_TRACKINGS — remove blanket public read
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read delivery trackings by share code" ON public.delivery_trackings;

-- Public lookup by exact share code only, via definer fn
CREATE OR REPLACE FUNCTION public.get_delivery_by_share_code(_share_code text)
RETURNS SETOF public.delivery_trackings
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.delivery_trackings WHERE share_code = _share_code LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_by_share_code(text) TO anon, authenticated;

-- =========================================================
-- 4. SUPER_ADMINS — remove public read
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read super_admins" ON public.super_admins;
-- is_super_admin() runs SECURITY DEFINER so it doesn't need a SELECT policy.

-- =========================================================
-- 5. BUSINESS_RIDERS — remove public PII exposure
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read rider location by postcode" ON public.business_riders;

-- Public-safe view (no phone, email, name)
CREATE OR REPLACE VIEW public.public_rider_locations AS
SELECT id, last_postcode, last_lat, last_lng, last_seen, status
FROM public.business_riders
WHERE last_postcode IS NOT NULL AND last_lat IS NOT NULL;

GRANT SELECT ON public.public_rider_locations TO anon, authenticated;

-- =========================================================
-- 6. CONTACT_MESSAGES — restrict to super admins
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can read all contact messages" ON public.contact_messages;

CREATE POLICY "Super admins read contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- =========================================================
-- 7. REFERRALS — restrict admin-read to actual admins
-- =========================================================
DROP POLICY IF EXISTS "Admins can read all referrals" ON public.referrals;

CREATE POLICY "Super admins read all referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- =========================================================
-- 8. BUSINESS_EARNINGS — restrict admin-read to actual admins
-- =========================================================
DROP POLICY IF EXISTS "Admins can read all business earnings" ON public.business_earnings;

CREATE POLICY "Super admins read all business earnings"
ON public.business_earnings FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- =========================================================
-- 9. SOS_ALERTS — admins only
-- =========================================================
DROP POLICY IF EXISTS "Public reads sos alerts" ON public.sos_alerts;

CREATE POLICY "Super admins read sos alerts"
ON public.sos_alerts FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- =========================================================
-- 10. EMERGENCY_CONTACTS — remove public read
-- =========================================================
DROP POLICY IF EXISTS "Public reads emergency contacts" ON public.emergency_contacts;

CREATE POLICY "Super admins read emergency contacts"
ON public.emergency_contacts FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- =========================================================
-- 11. DEVICE_REFERRALS / CLAIMS / USER_REFERRAL_BALANCES / LEADERBOARD
--     Strip public IP / user_id exposure
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read device referrals" ON public.device_referrals;
CREATE POLICY "Super admins read device referrals"
ON public.device_referrals FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "Anyone can read referral claims" ON public.device_referral_claims;
CREATE POLICY "Super admins read referral claims"
ON public.device_referral_claims FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "Anyone can read user referral balances" ON public.user_referral_balances;
CREATE POLICY "Users read own referral balance"
ON public.user_referral_balances FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Super admins read all referral balances"
ON public.user_referral_balances FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- Leaderboard: keep public read but hide IP via a view; revoke direct ip_address column read.
-- Simplest non-breaking fix: create a sanitized view and have the app use it.
CREATE OR REPLACE VIEW public.public_leaderboard AS
SELECT id, name, score, category, difficulty, accuracy, created_at
FROM public.leaderboard;
GRANT SELECT ON public.public_leaderboard TO anon, authenticated;

-- =========================================================
-- 12. TRACKING_SESSIONS — remove blanket public listability
-- =========================================================
DROP POLICY IF EXISTS "Public reads tracking sessions" ON public.tracking_sessions;

CREATE OR REPLACE FUNCTION public.get_tracking_session_by_share_code(_share_code text)
RETURNS SETOF public.tracking_sessions
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.tracking_sessions WHERE share_code = _share_code LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_tracking_session_by_share_code(text) TO anon, authenticated;

CREATE POLICY "Super admins read tracking sessions"
ON public.tracking_sessions FOR SELECT
TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));
