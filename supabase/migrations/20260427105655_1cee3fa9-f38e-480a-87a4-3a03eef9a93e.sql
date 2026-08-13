
CREATE OR REPLACE FUNCTION public.admin_list_withdrawals(
  _admin_email text DEFAULT NULL,
  _admin_pin text DEFAULT NULL,
  _status text DEFAULT NULL
)
RETURNS SETOF public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_super boolean := false;
  _is_staff boolean := false;
  _jwt_email text;
BEGIN
  -- Allow if caller is signed in as a super admin
  BEGIN
    _jwt_email := lower(coalesce(auth.jwt()->>'email', ''));
  EXCEPTION WHEN OTHERS THEN
    _jwt_email := '';
  END;

  IF _jwt_email <> '' AND EXISTS (
    SELECT 1 FROM public.super_admins WHERE lower(email) = _jwt_email
  ) THEN
    _is_super := true;
  END IF;

  -- Otherwise validate staff PIN
  IF NOT _is_super AND _admin_email IS NOT NULL AND _admin_pin IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.admin_staff
      WHERE lower(email) = lower(_admin_email)
        AND pin = _admin_pin
        AND is_active = true
    ) THEN
      _is_staff := true;
    END IF;
  END IF;

  IF NOT (_is_super OR _is_staff) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  RETURN QUERY
  SELECT * FROM public.withdrawals
  WHERE _status IS NULL OR status = _status
  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_withdrawals(text, text, text) TO anon, authenticated;
