
CREATE OR REPLACE FUNCTION public.admin_staff_login(_email text, _pin text)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.admin_staff
  SET last_login_at = now()
  WHERE email = lower(trim(_email))
    AND pin = trim(_pin)
    AND is_active = true
  RETURNING admin_staff.id, admin_staff.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_staff_login(text, text) TO anon, authenticated;
