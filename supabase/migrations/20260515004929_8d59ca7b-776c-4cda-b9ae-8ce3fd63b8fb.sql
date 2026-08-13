CREATE TABLE IF NOT EXISTS public.admin_allowed_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  label text,
  notes text,
  added_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_allowed_ips ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin_caller()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins sa
    JOIN auth.users u ON lower(u.email) = lower(sa.email)
    WHERE u.id = auth.uid()
  );
$$;

CREATE POLICY "super admins read admin_allowed_ips" ON public.admin_allowed_ips
  FOR SELECT TO authenticated USING (public.is_super_admin_caller());
CREATE POLICY "super admins insert admin_allowed_ips" ON public.admin_allowed_ips
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin_caller());
CREATE POLICY "super admins update admin_allowed_ips" ON public.admin_allowed_ips
  FOR UPDATE TO authenticated USING (public.is_super_admin_caller()) WITH CHECK (public.is_super_admin_caller());
CREATE POLICY "super admins delete admin_allowed_ips" ON public.admin_allowed_ips
  FOR DELETE TO authenticated USING (public.is_super_admin_caller());

CREATE OR REPLACE FUNCTION public.is_admin_ip_allowed(_ip text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE total int;
BEGIN
  SELECT count(*) INTO total FROM public.admin_allowed_ips;
  IF total = 0 THEN RETURN true; END IF;
  RETURN EXISTS (SELECT 1 FROM public.admin_allowed_ips WHERE ip_address = _ip);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_ip_allowed(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin_caller() TO authenticated;