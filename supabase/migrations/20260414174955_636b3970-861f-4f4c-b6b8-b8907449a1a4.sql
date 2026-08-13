ALTER TABLE public.admin_staff ADD COLUMN email text;

UPDATE public.admin_staff SET email = 'admin@loca8tor.com' WHERE name = 'Super Admin';
