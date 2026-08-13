
-- Plans catalog
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('fleet','api')),
  monthly_price_ngn integer NOT NULL,
  annual_price_ngn integer NOT NULL,
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Super admins manage plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (is_super_admin(auth.jwt() ->> 'email')) WITH CHECK (is_super_admin(auth.jwt() ->> 'email'));

INSERT INTO public.subscription_plans (code,name,category,monthly_price_ngn,annual_price_ngn,description,sort_order) VALUES
 ('fleet_standard','Standard','fleet',10000,102000,'Up to 10 riders, tracking, fleet mgmt, bulk messaging',1),
 ('fleet_premium','Premium','fleet',30000,306000,'Up to 40 riders, live map, analytics, route optimisation',2),
 ('api_starter','API Starter','api',30000,306000,'5,000 API calls / month',10),
 ('api_growth','API Growth','api',75000,765000,'25,000 API calls / month',11),
 ('api_scale','API Scale','api',200000,2040000,'100,000 API calls / month',12);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_code text NOT NULL REFERENCES public.subscription_plans(code),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','past_due','cancelled','expired')),
  auto_renew boolean NOT NULL DEFAULT false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  paga_persistent_account text,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins read all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (is_super_admin(auth.jwt() ->> 'email'));
CREATE POLICY "Super admins manage subscriptions" ON public.subscriptions FOR ALL TO authenticated
  USING (is_super_admin(auth.jwt() ->> 'email')) WITH CHECK (is_super_admin(auth.jwt() ->> 'email'));

-- Payment attempts
CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan_code text NOT NULL,
  billing_cycle text NOT NULL,
  amount_ngn integer NOT NULL,
  paga_reference text NOT NULL UNIQUE,
  paga_transaction_id text,
  checkout_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
  raw_request jsonb,
  raw_response jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscription_payments_user ON public.subscription_payments(user_id);
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payments" ON public.subscription_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins read all payments" ON public.subscription_payments FOR SELECT TO authenticated USING (is_super_admin(auth.jwt() ->> 'email'));

-- Touch updated_at
CREATE OR REPLACE FUNCTION public.subscriptions_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_subs_touch BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.subscriptions_touch_updated_at();
