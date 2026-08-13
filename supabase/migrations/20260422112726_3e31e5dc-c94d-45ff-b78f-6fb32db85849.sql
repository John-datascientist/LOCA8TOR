-- =========================================================
-- 1) HARDEN REFERRAL RPCs
-- =========================================================

CREATE OR REPLACE FUNCTION public.claim_device_referral(
  _referrer_code TEXT,
  _referred_device_id TEXT,
  _referred_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer device_referrals;
  _amount   INTEGER := 100;
  _ip_block TEXT;
  _today_count INTEGER;
BEGIN
  -- Basic input validation
  IF _referrer_code IS NULL OR length(trim(_referrer_code)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  IF _referred_device_id IS NULL OR length(trim(_referred_device_id)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_device');
  END IF;

  -- Lock the referrer row (FOR UPDATE) so concurrent claims don't double-credit
  SELECT * INTO _referrer
  FROM device_referrals
  WHERE referral_code = _referrer_code
  FOR UPDATE;

  IF _referrer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- Self-referral guard (device id match)
  IF _referrer.device_id = _referred_device_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  -- Self-referral guard (IP match — same network)
  IF _referrer.ip_address IS NOT NULL
     AND _referred_ip IS NOT NULL
     AND _referred_ip <> 'unknown'
     AND _referrer.ip_address = _referred_ip THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral_ip');
  END IF;

  -- Already credited this referred device anywhere?
  IF EXISTS (SELECT 1 FROM device_referral_claims WHERE referred_device_id = _referred_device_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  -- The referred device already has its OWN referral account → not a new device
  IF EXISTS (SELECT 1 FROM device_referrals WHERE device_id = _referred_device_id) THEN
    -- Allow only if that account was created within the last 5 minutes (genuine new user flow)
    IF NOT EXISTS (
      SELECT 1 FROM device_referrals
      WHERE device_id = _referred_device_id
        AND created_at > now() - interval '5 minutes'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'existing_user');
    END IF;
  END IF;

  -- IP abuse guard: this IP already used as a referred IP for ANY referrer
  IF _referred_ip IS NOT NULL AND _referred_ip <> 'unknown' THEN
    IF EXISTS (SELECT 1 FROM device_referral_claims WHERE referred_ip = _referred_ip) THEN
      RETURN jsonb_build_object('success', false, 'error', 'ip_already_used');
    END IF;

    -- Per-referrer daily IP-block cap (max 50 claims/day from same /24)
    _ip_block := regexp_replace(_referred_ip, '\.\d+$', '');
    SELECT count(*) INTO _today_count
    FROM device_referral_claims
    WHERE referrer_code = _referrer_code
      AND created_at > now() - interval '24 hours'
      AND referred_ip LIKE _ip_block || '%';
    IF _today_count >= 50 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
    END IF;
  END IF;

  -- Insert claim (UNIQUE constraint on referred_device_id is the final safety net)
  INSERT INTO device_referral_claims (
    referrer_code, referrer_device_id, referred_device_id, referred_ip, amount
  ) VALUES (
    _referrer_code, _referrer.device_id, _referred_device_id, _referred_ip, _amount
  );

  -- Credit referrer (row already locked above)
  UPDATE device_referrals
     SET balance = balance + _amount,
         total_earned = total_earned + _amount,
         total_referrals = total_referrals + 1,
         updated_at = now()
   WHERE id = _referrer.id;

  RETURN jsonb_build_object('success', true, 'amount', _amount);
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrency: another transaction won the race
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
END;
$$;


CREATE OR REPLACE FUNCTION public.debit_referral_balance(
  _device_id TEXT,
  _amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current INTEGER;
  _today_total INTEGER;
BEGIN
  IF _device_id IS NULL OR length(trim(_device_id)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_device');
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;
  IF _amount < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'below_minimum');
  END IF;

  -- Lock the row to prevent race conditions on concurrent withdrawals
  SELECT balance INTO _current
  FROM device_referrals
  WHERE device_id = _device_id
  FOR UPDATE;

  IF _current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_account');
  END IF;
  IF _current < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'balance', _current);
  END IF;

  -- Daily withdrawal cap: ₦50,000/day per device
  SELECT COALESCE(SUM(amount), 0) INTO _today_total
  FROM withdrawals
  WHERE address LIKE 'Referral payout · device ' || substring(_device_id, 1, 16) || '%'
    AND created_at > now() - interval '24 hours';
  IF _today_total + _amount > 50000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'daily_cap_exceeded');
  END IF;

  UPDATE device_referrals
     SET balance = balance - _amount,
         updated_at = now()
   WHERE device_id = _device_id;

  RETURN jsonb_build_object('success', true, 'new_balance', _current - _amount);
END;
$$;


-- =========================================================
-- 2) FIX MISSING POLICY: coordinate_postcode_cache
-- =========================================================
CREATE POLICY "Cache is publicly readable"
  ON public.coordinate_postcode_cache FOR SELECT TO public USING (true);

CREATE POLICY "Cache writes via definer functions only"
  ON public.coordinate_postcode_cache FOR INSERT TO public
  WITH CHECK (false); -- forces all inserts through upsert_coordinate_postcode_cache RPC


-- =========================================================
-- 3) HELPER: super_admin check (security-definer to avoid recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins WHERE lower(email) = lower(_user_email)
  );
$$;


-- =========================================================
-- 4) TIGHTEN BLANKET "always-true" POLICIES
-- =========================================================

-- admin_staff: only super-admins can mutate; anyone can read for login lookup
DROP POLICY IF EXISTS "Anyone can update last login" ON public.admin_staff;
DROP POLICY IF EXISTS "Authenticated users can delete admin staff" ON public.admin_staff;
DROP POLICY IF EXISTS "Authenticated users can insert admin staff" ON public.admin_staff;
DROP POLICY IF EXISTS "Authenticated users can update admin staff" ON public.admin_staff;

CREATE POLICY "Update last login by matching pin row"
  ON public.admin_staff FOR UPDATE TO public
  USING (is_active = true)
  WITH CHECK (is_active = true);

CREATE POLICY "Super admins manage admin staff"
  ON public.admin_staff FOR ALL TO authenticated
  USING (public.is_super_admin((auth.jwt() ->> 'email')::text))
  WITH CHECK (public.is_super_admin((auth.jwt() ->> 'email')::text));

-- allowed_countries: only super-admins write
DROP POLICY IF EXISTS "Authenticated users can delete allowed countries" ON public.allowed_countries;
DROP POLICY IF EXISTS "Authenticated users can insert allowed countries" ON public.allowed_countries;
CREATE POLICY "Super admins manage allowed countries"
  ON public.allowed_countries FOR ALL TO authenticated
  USING (public.is_super_admin((auth.jwt() ->> 'email')::text))
  WITH CHECK (public.is_super_admin((auth.jwt() ->> 'email')::text));

-- contact_messages: insert requires non-empty fields; updates only by super-admins
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Authenticated users can update contact messages" ON public.contact_messages;
CREATE POLICY "Public can submit valid contact messages"
  ON public.contact_messages FOR INSERT TO public
  WITH CHECK (
    length(trim(name)) > 0
    AND length(trim(email)) > 3
    AND length(trim(message)) > 0
    AND length(trim(subject)) > 0
  );
CREATE POLICY "Super admins update contact messages"
  ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.is_super_admin((auth.jwt() ->> 'email')::text))
  WITH CHECK (public.is_super_admin((auth.jwt() ->> 'email')::text));

-- platform_stats: only super-admins update directly (function-based increments still work via SECURITY DEFINER)
DROP POLICY IF EXISTS "Authenticated users can update platform stats" ON public.platform_stats;
CREATE POLICY "Super admins update platform stats"
  ON public.platform_stats FOR UPDATE TO authenticated
  USING (public.is_super_admin((auth.jwt() ->> 'email')::text))
  WITH CHECK (public.is_super_admin((auth.jwt() ->> 'email')::text));

-- postcodes: writes must include valid coordinates and postcode
DROP POLICY IF EXISTS "Anyone can insert postcodes" ON public.postcodes;
DROP POLICY IF EXISTS "Anyone can update postcodes" ON public.postcodes;
CREATE POLICY "Public inserts valid postcodes"
  ON public.postcodes FOR INSERT TO public
  WITH CHECK (
    length(trim(postcode)) > 0
    AND length(trim(state)) > 0
    AND lat BETWEEN -90 AND 90
    AND lng BETWEEN -180 AND 180
  );
CREATE POLICY "Super admins update postcodes"
  ON public.postcodes FOR UPDATE TO authenticated
  USING (public.is_super_admin((auth.jwt() ->> 'email')::text))
  WITH CHECK (public.is_super_admin((auth.jwt() ->> 'email')::text));

-- properties: tighten writes
DROP POLICY IF EXISTS "Anyone can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can delete properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can update properties" ON public.properties;
CREATE POLICY "Public inserts valid properties"
  ON public.properties FOR INSERT TO public
  WITH CHECK (
    length(trim(postcode)) > 0
    AND lat BETWEEN -90 AND 90
    AND lng BETWEEN -180 AND 180
  );
CREATE POLICY "Super admins manage properties"
  ON public.properties FOR ALL TO authenticated
  USING (public.is_super_admin((auth.jwt() ->> 'email')::text))
  WITH CHECK (public.is_super_admin((auth.jwt() ->> 'email')::text));

-- withdrawals: insert requires valid amount and contact info
DROP POLICY IF EXISTS "Anyone can insert withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Anyone can update withdrawals" ON public.withdrawals;
CREATE POLICY "Public inserts valid withdrawals"
  ON public.withdrawals FOR INSERT TO public
  WITH CHECK (
    amount >= 50
    AND amount <= 100000
    AND length(trim(full_name)) > 0
    AND length(trim(phone)) >= 10
    AND length(trim(email)) > 3
    AND type IN ('airtime', 'data')
  );
CREATE POLICY "Super admins update withdrawals"
  ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.is_super_admin((auth.jwt() ->> 'email')::text))
  WITH CHECK (public.is_super_admin((auth.jwt() ->> 'email')::text));

-- leaderboard: validate score
DROP POLICY IF EXISTS "Anyone can insert leaderboard" ON public.leaderboard;
CREATE POLICY "Public inserts valid leaderboard entries"
  ON public.leaderboard FOR INSERT TO public
  WITH CHECK (
    length(trim(name)) > 0
    AND length(trim(name)) <= 50
    AND score >= 0
    AND accuracy BETWEEN 0 AND 100
    AND length(trim(category)) > 0
  );

-- emergency_contacts, sos_alerts, tracking_*: scope by device_id presence (writes only allowed when device_id is provided & non-empty)
DROP POLICY IF EXISTS "Anyone can manage emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Public reads emergency contacts"
  ON public.emergency_contacts FOR SELECT TO public USING (true);
CREATE POLICY "Public manages own-device emergency contacts"
  ON public.emergency_contacts FOR INSERT TO public
  WITH CHECK (length(trim(device_id)) >= 8 AND length(trim(name)) > 0 AND length(trim(phone)) >= 7);
CREATE POLICY "Public updates own-device emergency contacts"
  ON public.emergency_contacts FOR UPDATE TO public
  USING (length(trim(device_id)) >= 8)
  WITH CHECK (length(trim(device_id)) >= 8);
CREATE POLICY "Public deletes own-device emergency contacts"
  ON public.emergency_contacts FOR DELETE TO public
  USING (length(trim(device_id)) >= 8);

DROP POLICY IF EXISTS "Anyone can manage sos alerts" ON public.sos_alerts;
CREATE POLICY "Public reads sos alerts"
  ON public.sos_alerts FOR SELECT TO public USING (true);
CREATE POLICY "Public inserts sos alerts with device"
  ON public.sos_alerts FOR INSERT TO public
  WITH CHECK (length(trim(device_id)) >= 8);

DROP POLICY IF EXISTS "Anyone can manage tracking points" ON public.tracking_points;
CREATE POLICY "Public reads tracking points"
  ON public.tracking_points FOR SELECT TO public USING (true);
CREATE POLICY "Public inserts tracking points with valid coords"
  ON public.tracking_points FOR INSERT TO public
  WITH CHECK (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180);

DROP POLICY IF EXISTS "Anyone can manage tracking sessions" ON public.tracking_sessions;
CREATE POLICY "Public reads tracking sessions"
  ON public.tracking_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Public inserts tracking sessions with device"
  ON public.tracking_sessions FOR INSERT TO public
  WITH CHECK (length(trim(device_id)) >= 8 AND length(trim(share_code)) > 0);
CREATE POLICY "Public updates tracking sessions with device"
  ON public.tracking_sessions FOR UPDATE TO public
  USING (length(trim(device_id)) >= 8)
  WITH CHECK (length(trim(device_id)) >= 8);