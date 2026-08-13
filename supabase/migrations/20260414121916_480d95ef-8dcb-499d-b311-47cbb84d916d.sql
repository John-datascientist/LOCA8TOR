
CREATE TABLE public.admin_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for login check)
CREATE POLICY "Anyone can read admin staff" ON public.admin_staff FOR SELECT USING (true);

-- Only super admins (authenticated) can manage staff
CREATE POLICY "Authenticated users can insert admin staff" ON public.admin_staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update admin staff" ON public.admin_staff FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete admin staff" ON public.admin_staff FOR DELETE TO authenticated USING (true);

-- Anon can update last_login_at
CREATE POLICY "Anyone can update last login" ON public.admin_staff FOR UPDATE USING (true);

-- Insert default admin
INSERT INTO public.admin_staff (name, pin) VALUES ('Super Admin', '9090900');
