
-- 1. Extend riders with ban + signup IP fields
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS signup_ip text,
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_riders_signup_ip ON public.riders(signup_ip) WHERE signup_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_riders_is_banned ON public.riders(is_banned) WHERE is_banned = true;

-- 2. Banned identifiers
CREATE TABLE IF NOT EXISTS public.banned_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('email','phone','ip')),
  value text NOT NULL,
  reason text,
  banned_by text,
  banned_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_banned_identifiers ON public.banned_identifiers (kind, lower(value));

ALTER TABLE public.banned_identifiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage banned identifiers" ON public.banned_identifiers;
CREATE POLICY "Super admins manage banned identifiers"
  ON public.banned_identifiers
  FOR ALL
  TO authenticated
  USING (is_super_admin((auth.jwt() ->> 'email'::text)))
  WITH CHECK (is_super_admin((auth.jwt() ->> 'email'::text)));

-- 3. User notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.user_notifications;
CREATE POLICY "Users read own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users mark own notifications read" ON public.user_notifications;
CREATE POLICY "Users mark own notifications read"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins manage notifications" ON public.user_notifications;
CREATE POLICY "Super admins manage notifications"
  ON public.user_notifications FOR ALL
  TO authenticated
  USING (is_super_admin((auth.jwt() ->> 'email'::text)))
  WITH CHECK (is_super_admin((auth.jwt() ->> 'email'::text)));

-- 4. Pre-signup uniqueness check (also blocks banned identifiers)
CREATE OR REPLACE FUNCTION public.check_signup_unique(
  p_email text,
  p_full_name text,
  p_phone text,
  p_ip text
)
RETURNS TABLE(ok boolean, conflict text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(coalesce(trim(p_email), ''));
  v_name text := lower(coalesce(trim(p_full_name), ''));
  v_phone text := coalesce(trim(p_phone), '');
  v_ip text := coalesce(trim(p_ip), '');
BEGIN
  -- Banned identifiers first
  IF v_email <> '' AND EXISTS (SELECT 1 FROM banned_identifiers WHERE kind='email' AND lower(value)=v_email) THEN
    RETURN QUERY SELECT false, 'email', 'This email is blocked from creating new accounts.'; RETURN;
  END IF;
  IF v_phone <> '' AND EXISTS (SELECT 1 FROM banned_identifiers WHERE kind='phone' AND value=v_phone) THEN
    RETURN QUERY SELECT false, 'phone', 'This phone number is blocked from creating new accounts.'; RETURN;
  END IF;
  IF v_ip <> '' AND EXISTS (SELECT 1 FROM banned_identifiers WHERE kind='ip' AND value=v_ip) THEN
    RETURN QUERY SELECT false, 'ip', 'This network is blocked from creating new accounts.'; RETURN;
  END IF;

  -- Existing rider duplicates
  IF v_phone <> '' AND EXISTS (SELECT 1 FROM riders WHERE phone = v_phone) THEN
    RETURN QUERY SELECT false, 'phone', 'This phone number is already linked to another account.'; RETURN;
  END IF;
  IF v_name <> '' AND EXISTS (SELECT 1 FROM riders WHERE lower(full_name) = v_name) THEN
    RETURN QUERY SELECT false, 'full_name', 'An account already exists with this exact name. Please use a different name.'; RETURN;
  END IF;
  IF v_ip <> '' AND EXISTS (SELECT 1 FROM riders WHERE signup_ip = v_ip AND is_banned = false) THEN
    RETURN QUERY SELECT false, 'ip', 'An account has already been created from this network. Please sign in instead.'; RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_signup_unique(text,text,text,text) TO anon, authenticated;

-- 5. Trigger on riders insert: block banned phones/IPs
CREATE OR REPLACE FUNCTION public.riders_block_banned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM banned_identifiers WHERE kind='phone' AND value = NEW.phone
  ) THEN
    RAISE EXCEPTION 'This phone number is blocked from creating new accounts.';
  END IF;
  IF NEW.signup_ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM banned_identifiers WHERE kind='ip' AND value = NEW.signup_ip
  ) THEN
    RAISE EXCEPTION 'This network is blocked from creating new accounts.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_riders_block_banned ON public.riders;
CREATE TRIGGER trg_riders_block_banned
  BEFORE INSERT ON public.riders
  FOR EACH ROW EXECUTE FUNCTION public.riders_block_banned();

-- 6. Admin ban / unban RPCs
CREATE OR REPLACE FUNCTION public.admin_ban_account(p_user_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_phone text;
  v_ip text;
  v_email text;
BEGIN
  IF NOT is_super_admin(v_caller) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  SELECT phone, signup_ip INTO v_phone, v_ip FROM riders WHERE user_id = p_user_id;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  UPDATE riders
    SET is_banned = true,
        ban_reason = p_reason,
        banned_at = now()
    WHERE user_id = p_user_id;

  IF v_email IS NOT NULL AND v_email <> '' THEN
    INSERT INTO banned_identifiers(kind, value, reason, banned_by, banned_user_id)
    VALUES ('email', v_email, p_reason, v_caller, p_user_id)
    ON CONFLICT (kind, lower(value)) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_user_id = EXCLUDED.banned_user_id;
  END IF;
  IF v_phone IS NOT NULL AND v_phone <> '' THEN
    INSERT INTO banned_identifiers(kind, value, reason, banned_by, banned_user_id)
    VALUES ('phone', v_phone, p_reason, v_caller, p_user_id)
    ON CONFLICT (kind, lower(value)) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_user_id = EXCLUDED.banned_user_id;
  END IF;
  IF v_ip IS NOT NULL AND v_ip <> '' THEN
    INSERT INTO banned_identifiers(kind, value, reason, banned_by, banned_user_id)
    VALUES ('ip', v_ip, p_reason, v_caller, p_user_id)
    ON CONFLICT (kind, lower(value)) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_user_id = EXCLUDED.banned_user_id;
  END IF;

  INSERT INTO user_notifications(user_id, title, body, kind)
  VALUES (
    p_user_id,
    'Your account has been banned',
    COALESCE('Reason: ' || p_reason, 'Your account has been banned by an administrator.') ||
    E'\n\nIf you believe this is a mistake, please contact support at support@loca8tor.com.',
    'ban'
  );

  INSERT INTO admin_audit_log(actor_email, action, target, metadata)
  VALUES (v_caller, 'ban_account', p_user_id::text, jsonb_build_object('reason', p_reason, 'email', v_email, 'phone', v_phone, 'ip', v_ip));

  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_ban_account(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unban_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_phone text;
  v_ip text;
  v_email text;
BEGIN
  IF NOT is_super_admin(v_caller) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT phone, signup_ip INTO v_phone, v_ip FROM riders WHERE user_id = p_user_id;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  UPDATE riders SET is_banned = false, ban_reason = NULL, banned_at = NULL WHERE user_id = p_user_id;

  DELETE FROM banned_identifiers
    WHERE banned_user_id = p_user_id
       OR (kind='email' AND lower(value) = lower(coalesce(v_email,'')))
       OR (kind='phone' AND value = coalesce(v_phone,''))
       OR (kind='ip' AND value = coalesce(v_ip,''));

  INSERT INTO admin_audit_log(actor_email, action, target)
  VALUES (v_caller, 'unban_account', p_user_id::text);

  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_unban_account(uuid) TO authenticated;

-- 7. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
