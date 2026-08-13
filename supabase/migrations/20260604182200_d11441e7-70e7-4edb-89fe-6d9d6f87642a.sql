
-- 1) Extend check_signup_unique to block duplicate emails already in auth.users
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
  v_phone_key text := public.normalize_phone_key(p_phone);
  v_ip text := coalesce(trim(p_ip), '');
BEGIN
  IF v_email <> '' AND EXISTS (SELECT 1 FROM banned_identifiers WHERE kind='email' AND lower(value)=v_email) THEN
    RETURN QUERY SELECT false, 'email', 'This email is blocked from creating new accounts.'; RETURN;
  END IF;
  IF v_phone_key <> '' AND EXISTS (
    SELECT 1 FROM banned_identifiers
    WHERE kind='phone' AND public.normalize_phone_key(value) = v_phone_key
  ) THEN
    RETURN QUERY SELECT false, 'phone', 'This phone number is blocked from creating new accounts.'; RETURN;
  END IF;
  IF v_ip <> '' AND EXISTS (SELECT 1 FROM banned_identifiers WHERE kind='ip' AND value=v_ip) THEN
    RETURN QUERY SELECT false, 'ip', 'This network is blocked from creating new accounts.'; RETURN;
  END IF;

  -- Block duplicate email already registered in auth
  IF v_email <> '' AND EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RETURN QUERY SELECT false, 'email', 'This email is already registered. Please sign in instead.'; RETURN;
  END IF;

  IF v_phone_key <> '' AND EXISTS (SELECT 1 FROM riders WHERE public.normalize_phone_key(phone) = v_phone_key) THEN
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

-- 2) Lock identity fields on riders for non-super-admin updates
CREATE OR REPLACE FUNCTION public.riders_lock_identity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role / no JWT (server-side ops) and super admins to change anything
  IF auth.uid() IS NULL OR public.is_super_admin_caller() THEN
    RETURN NEW;
  END IF;

  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    RAISE EXCEPTION 'Phone number cannot be changed. Please contact support.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    RAISE EXCEPTION 'Full name cannot be changed. Please contact support.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.business_name IS DISTINCT FROM OLD.business_name THEN
    RAISE EXCEPTION 'Business name cannot be changed. Please contact support.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.cac_number IS DISTINCT FROM OLD.cac_number THEN
    RAISE EXCEPTION 'CAC number cannot be changed. Please contact support.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS riders_lock_identity_fields_trg ON public.riders;
CREATE TRIGGER riders_lock_identity_fields_trg
BEFORE UPDATE ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.riders_lock_identity_fields();
