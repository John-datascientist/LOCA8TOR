
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read super_admins" ON public.super_admins FOR SELECT TO public USING (true);

INSERT INTO public.super_admins (email) VALUES ('johnspeaksuwangue@gmail.com');
