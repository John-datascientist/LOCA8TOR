
-- =========================================
-- BUSINESS WALLETS
-- =========================================
CREATE TABLE public.business_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL UNIQUE,
  balance_ngn numeric NOT NULL DEFAULT 0 CHECK (balance_ngn >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.business_wallets TO authenticated;
GRANT ALL ON public.business_wallets TO service_role;

ALTER TABLE public.business_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own wallet"
  ON public.business_wallets FOR SELECT TO authenticated
  USING (business_user_id = auth.uid());

CREATE POLICY "Super admins read all wallets"
  ON public.business_wallets FOR SELECT TO authenticated
  USING (is_super_admin((auth.jwt() ->> 'email')));

-- =========================================
-- WALLET TRANSACTIONS
-- =========================================
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('credit','debit')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','successful','failed')),
  payment_method text NOT NULL CHECK (payment_method IN ('card','bank_transfer','wallet_debit')),
  payment_provider text,
  provider_reference text UNIQUE,
  description text,
  subscription_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(business_user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_ref ON public.wallet_transactions(provider_reference);

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (business_user_id = auth.uid());

CREATE POLICY "Super admins read all wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (is_super_admin((auth.jwt() ->> 'email')));

-- =========================================
-- BUSINESS SUBSCRIPTIONS
-- =========================================
CREATE TABLE public.business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL,
  plan_code text NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','cancelled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_renewal_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_business_sub_unique_active
  ON public.business_subscriptions(business_user_id)
  WHERE status IN ('active','past_due');

GRANT SELECT ON public.business_subscriptions TO authenticated;
GRANT ALL ON public.business_subscriptions TO service_role;

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON public.business_subscriptions FOR SELECT TO authenticated
  USING (business_user_id = auth.uid());

CREATE POLICY "Users cancel own subscription"
  ON public.business_subscriptions FOR UPDATE TO authenticated
  USING (business_user_id = auth.uid())
  WITH CHECK (business_user_id = auth.uid());

CREATE POLICY "Super admins read all subscriptions"
  ON public.business_subscriptions FOR SELECT TO authenticated
  USING (is_super_admin((auth.jwt() ->> 'email')));

-- =========================================
-- updated_at trigger
-- =========================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.business_wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_wallet_tx_updated BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_business_sub_updated BEFORE UPDATE ON public.business_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- HELPER: is this user a business account?
-- =========================================
CREATE OR REPLACE FUNCTION public.is_business_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.riders
    WHERE user_id = _user_id AND account_type = 'business'
  );
$$;

-- =========================================
-- RPC: credit_wallet (idempotent)
-- =========================================
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _user_id uuid,
  _amount numeric,
  _provider_reference text,
  _method text,
  _description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tx_id uuid;
  _existing record;
  _new_balance numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;
  IF NOT public.is_business_account(_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_business_account');
  END IF;

  -- Idempotency: if a successful credit with this reference already exists, no-op.
  SELECT * INTO _existing FROM public.wallet_transactions
    WHERE provider_reference = _provider_reference;

  IF FOUND AND _existing.status = 'successful' THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', _existing.id);
  END IF;

  -- Ensure wallet row exists
  INSERT INTO public.business_wallets(business_user_id, balance_ngn)
  VALUES (_user_id, 0)
  ON CONFLICT (business_user_id) DO NOTHING;

  -- Lock the wallet row
  PERFORM 1 FROM public.business_wallets
    WHERE business_user_id = _user_id FOR UPDATE;

  IF FOUND THEN
    NULL;
  END IF;

  IF _existing.id IS NOT NULL THEN
    UPDATE public.wallet_transactions
      SET status = 'successful', updated_at = now()
      WHERE id = _existing.id;
    _tx_id := _existing.id;
  ELSE
    INSERT INTO public.wallet_transactions(
      business_user_id, amount, type, status, payment_method,
      payment_provider, provider_reference, description
    ) VALUES (
      _user_id, _amount, 'credit', 'successful', _method,
      'paga', _provider_reference, COALESCE(_description, 'Wallet funding')
    ) RETURNING id INTO _tx_id;
  END IF;

  UPDATE public.business_wallets
    SET balance_ngn = balance_ngn + _amount
    WHERE business_user_id = _user_id
    RETURNING balance_ngn INTO _new_balance;

  RETURN jsonb_build_object('ok', true, 'transaction_id', _tx_id, 'new_balance', _new_balance);
END;
$$;

-- =========================================
-- RPC: debit_wallet_for_subscription
-- =========================================
CREATE OR REPLACE FUNCTION public.debit_wallet_for_subscription(
  _user_id uuid,
  _plan_code text,
  _cycle text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
  _amount numeric;
  _balance numeric;
  _sub_id uuid;
  _tx_id uuid;
  _period_end timestamptz;
BEGIN
  IF NOT public.is_business_account(_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_business_account');
  END IF;
  IF _cycle NOT IN ('monthly','annual') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_cycle');
  END IF;

  SELECT * INTO _plan FROM public.subscription_plans
    WHERE code = _plan_code AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'plan_not_found');
  END IF;

  _amount := CASE WHEN _cycle = 'annual' THEN _plan.annual_price_ngn ELSE _plan.monthly_price_ngn END;

  -- Lock wallet
  SELECT balance_ngn INTO _balance FROM public.business_wallets
    WHERE business_user_id = _user_id FOR UPDATE;

  IF NOT FOUND OR _balance < _amount THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient_funds',
      'required', _amount, 'balance', COALESCE(_balance, 0)
    );
  END IF;

  _period_end := CASE WHEN _cycle = 'annual'
    THEN now() + INTERVAL '1 year' ELSE now() + INTERVAL '1 month' END;

  -- Upsert subscription
  INSERT INTO public.business_subscriptions(
    business_user_id, plan_code, billing_cycle, status,
    current_period_start, current_period_end, next_renewal_at
  ) VALUES (
    _user_id, _plan_code, _cycle, 'active', now(), _period_end, _period_end
  )
  ON CONFLICT (business_user_id) WHERE status IN ('active','past_due')
  DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    billing_cycle = EXCLUDED.billing_cycle,
    status = 'active',
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    next_renewal_at = EXCLUDED.next_renewal_at,
    updated_at = now()
  RETURNING id INTO _sub_id;

  -- Debit
  UPDATE public.business_wallets
    SET balance_ngn = balance_ngn - _amount
    WHERE business_user_id = _user_id
    RETURNING balance_ngn INTO _balance;

  INSERT INTO public.wallet_transactions(
    business_user_id, amount, type, status, payment_method,
    description, subscription_id
  ) VALUES (
    _user_id, _amount, 'debit', 'successful', 'wallet_debit',
    'Subscription: ' || _plan.name || ' (' || _cycle || ')', _sub_id
  ) RETURNING id INTO _tx_id;

  -- Reflect on rider profile
  UPDATE public.riders SET subscription_status = 'active'
    WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'ok', true, 'subscription_id', _sub_id, 'transaction_id', _tx_id,
    'new_balance', _balance, 'period_end', _period_end
  );
END;
$$;

-- =========================================
-- RPC: process_subscription_renewal (called by cron)
-- =========================================
CREATE OR REPLACE FUNCTION public.process_subscription_renewal(_subscription_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub record;
  _result jsonb;
BEGIN
  SELECT * INTO _sub FROM public.business_subscriptions
    WHERE id = _subscription_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_not_found');
  END IF;
  IF _sub.status = 'cancelled' OR NOT _sub.auto_renew THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_renewable');
  END IF;

  _result := public.debit_wallet_for_subscription(_sub.business_user_id, _sub.plan_code, _sub.billing_cycle);

  IF (_result->>'ok')::boolean THEN
    RETURN _result;
  ELSE
    UPDATE public.business_subscriptions
      SET status = 'past_due', updated_at = now()
      WHERE id = _subscription_id;
    UPDATE public.riders SET subscription_status = 'paused'
      WHERE user_id = _sub.business_user_id;
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_funds', 'marked', 'past_due');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet(uuid,numeric,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_wallet_for_subscription(uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_subscription_renewal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_business_account(uuid) TO authenticated, service_role;
