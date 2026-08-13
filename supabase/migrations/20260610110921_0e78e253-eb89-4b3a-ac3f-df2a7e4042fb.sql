
INSERT INTO public.subscription_plans (code, name, category, monthly_price_ngn, annual_price_ngn, description, features, sort_order, is_active)
VALUES (
  'individual_rider',
  'Individual Rider / Driver',
  'rider',
  2000,
  20000,
  'For independent riders and drivers not linked to a business. 7-day free trial.',
  '["Postcode search & lookup","Google Maps view","Earnings tracker & route history","Turn-by-turn navigation","Live delivery map"]'::jsonb,
  5,
  true
)
ON CONFLICT (code) DO UPDATE SET
  monthly_price_ngn = EXCLUDED.monthly_price_ngn,
  annual_price_ngn = EXCLUDED.annual_price_ngn,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  is_active = true;

ALTER TABLE public.business_subscriptions
  ADD COLUMN IF NOT EXISTS account_type text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method_id text,
  ADD COLUMN IF NOT EXISTS setup_intent_id text,
  ADD COLUMN IF NOT EXISTS billing_method text;

CREATE OR REPLACE FUNCTION public.admin_get_user_brief(_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  full_name text,
  business_name text,
  email text,
  phone text,
  account_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    COALESCE(r.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') AS full_name,
    COALESCE(r.business_name, u.raw_user_meta_data->>'business_name') AS business_name,
    u.email::text AS email,
    COALESCE(r.phone, u.raw_user_meta_data->>'phone') AS phone,
    COALESCE(r.account_type, u.raw_user_meta_data->>'account_type') AS account_type
  FROM auth.users u
  LEFT JOIN public.riders r ON r.user_id = u.id
  WHERE u.id = ANY(_user_ids)
    AND (
      EXISTS (
        SELECT 1 FROM public.super_admins sa
        JOIN auth.users au ON au.email = sa.email
        WHERE au.id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.admin_staff ast
        JOIN auth.users au ON au.email = ast.email
        WHERE au.id = auth.uid() AND ast.is_active
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_brief(uuid[]) TO authenticated;
