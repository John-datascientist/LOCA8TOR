CREATE POLICY "Users read own super_admin row"
  ON public.super_admins
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(coalesce((auth.jwt() ->> 'email')::text, '')));