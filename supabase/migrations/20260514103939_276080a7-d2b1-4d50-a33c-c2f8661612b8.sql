-- Audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email text NOT NULL,
  action text NOT NULL,
  target text,
  row_count integer,
  ip_address text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read audit log" ON public.admin_audit_log;
CREATE POLICY "Super admins read audit log"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- No direct insert/update/delete policies — writes only via SECURITY DEFINER fn

-- Restrict registered users listing to super admins only
CREATE OR REPLACE FUNCTION public.admin_list_registered_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  phone text,
  account_type text,
  business_name text,
  business_code text,
  cac_number text,
  postcode text,
  location text,
  referral_code text,
  subscription_status text,
  email_verified boolean,
  signed_up_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin((auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'Not authorized: super admin only';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    COALESCE(r.full_name, (u.raw_user_meta_data->>'full_name')) AS full_name,
    r.phone,
    COALESCE(r.account_type, 'individual') AS account_type,
    r.business_name,
    r.business_code,
    r.cac_number,
    r.postcode,
    r.location,
    r.referral_code,
    COALESCE(r.subscription_status, 'none') AS subscription_status,
    (u.email_confirmed_at IS NOT NULL) AS email_verified,
    u.created_at AS signed_up_at
  FROM auth.users u
  LEFT JOIN public.riders r ON r.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;

-- Audit-log writer (super admin only)
CREATE OR REPLACE FUNCTION public.admin_log_export(
  _action text,
  _target text,
  _row_count integer,
  _ip_address text DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text := auth.jwt() ->> 'email';
  _id uuid;
BEGIN
  IF NOT public.is_super_admin(_email) THEN
    RAISE EXCEPTION 'Not authorized: super admin only';
  END IF;

  INSERT INTO public.admin_audit_log (actor_email, action, target, row_count, ip_address, metadata)
  VALUES (_email, _action, _target, _row_count, _ip_address, _metadata)
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;