
-- Allow a 'rider' category in subscription plans
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_category_check;
ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_category_check
  CHECK (category IN ('fleet','api','rider'));

INSERT INTO public.subscription_plans
  (code, name, category, monthly_price_ngn, annual_price_ngn, description, sort_order, is_active)
VALUES
  ('rider_solo', 'Solo Rider', 'rider', 1000, 10200,
   'For independent riders not under a logistics company. Live tracking, earnings, delivery tools.',
   0, true)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      category = EXCLUDED.category,
      monthly_price_ngn = EXCLUDED.monthly_price_ngn,
      annual_price_ngn = EXCLUDED.annual_price_ngn,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order,
      is_active = true;
