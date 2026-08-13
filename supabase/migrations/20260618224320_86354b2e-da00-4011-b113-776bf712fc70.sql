
-- 1) Add referral discount column for next renewal
ALTER TABLE public.business_subscriptions
  ADD COLUMN IF NOT EXISTS next_renewal_discount_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_renewal_discount_source uuid;

-- 2) Backfill referral_code on every rider/business account
UPDATE public.riders
SET referral_code = 'REF-' || upper(substr(replace(id::text, '-', ''), 1, 6))
WHERE referral_code IS NULL OR referral_code = '';

-- 3) Helper to grant a 30% referral discount to a referrer when their referred user pays
CREATE OR REPLACE FUNCTION public.grant_referral_discount_for(_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rr public.rider_referrals;
  _updated int := 0;
BEGIN
  SELECT * INTO _rr
  FROM public.rider_referrals
  WHERE referred_user_id = _referred_user_id
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_pending_referral');
  END IF;

  UPDATE public.rider_referrals
    SET status = 'subscribed',
        subscribed_at = COALESCE(subscribed_at, now()),
        credits_earned = 30
    WHERE id = _rr.id;

  UPDATE public.business_subscriptions
    SET next_renewal_discount_percent = GREATEST(next_renewal_discount_percent, 30),
        next_renewal_discount_source = _rr.id,
        updated_at = now()
    WHERE business_user_id = _rr.referrer_user_id
      AND status IN ('active','past_due');
  GET DIAGNOSTICS _updated = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'referrer_user_id', _rr.referrer_user_id, 'discount_applied_to_subs', _updated);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_referral_discount_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_referral_discount_for(uuid) TO service_role;

-- 4) Update debit_wallet_for_subscription to honor and consume the 30% discount,
--    and to credit any pending referrer when this user pays.
CREATE OR REPLACE FUNCTION public.debit_wallet_for_subscription(_user_id uuid, _plan_code text, _cycle text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan record;
  _amount numeric;
  _gross numeric;
  _discount int := 0;
  _balance numeric;
  _sub_id uuid;
  _tx_id uuid;
  _period_end timestamptz;
  _existing record;
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

  _gross := CASE WHEN _cycle = 'annual' THEN _plan.annual_price_ngn ELSE _plan.monthly_price_ngn END;

  -- Find pending discount on the active/past_due subscription (if any)
  SELECT id, next_renewal_discount_percent
    INTO _existing
    FROM public.business_subscriptions
    WHERE business_user_id = _user_id
      AND status IN ('active','past_due')
    LIMIT 1;

  _discount := COALESCE(_existing.next_renewal_discount_percent, 0);
  IF _discount < 0 THEN _discount := 0; END IF;
  IF _discount > 90 THEN _discount := 90; END IF;

  _amount := round(_gross * (100 - _discount) / 100.0);

  -- Lock wallet
  SELECT balance_ngn INTO _balance FROM public.business_wallets
    WHERE business_user_id = _user_id FOR UPDATE;

  IF NOT FOUND OR _balance < _amount THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient_funds',
      'required', _amount, 'balance', COALESCE(_balance, 0),
      'discount_percent', _discount
    );
  END IF;

  _period_end := CASE WHEN _cycle = 'annual'
    THEN now() + INTERVAL '1 year' ELSE now() + INTERVAL '1 month' END;

  INSERT INTO public.business_subscriptions(
    business_user_id, plan_code, billing_cycle, status,
    current_period_start, current_period_end, next_renewal_at,
    next_renewal_discount_percent, next_renewal_discount_source
  ) VALUES (
    _user_id, _plan_code, _cycle, 'active', now(), _period_end, _period_end,
    0, NULL
  )
  ON CONFLICT (business_user_id) WHERE status IN ('active','past_due')
  DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    billing_cycle = EXCLUDED.billing_cycle,
    status = 'active',
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    next_renewal_at = EXCLUDED.next_renewal_at,
    next_renewal_discount_percent = 0,
    next_renewal_discount_source = NULL,
    updated_at = now()
  RETURNING id INTO _sub_id;

  UPDATE public.business_wallets
    SET balance_ngn = balance_ngn - _amount
    WHERE business_user_id = _user_id
    RETURNING balance_ngn INTO _balance;

  INSERT INTO public.wallet_transactions(
    business_user_id, amount, type, status, payment_method,
    description, subscription_id
  ) VALUES (
    _user_id, _amount, 'debit', 'successful', 'wallet_debit',
    'Subscription: ' || _plan.name || ' (' || _cycle || ')'
      || CASE WHEN _discount > 0 THEN ' — ' || _discount || '% referral discount applied' ELSE '' END,
    _sub_id
  ) RETURNING id INTO _tx_id;

  UPDATE public.riders SET subscription_status = 'active'
    WHERE user_id = _user_id;

  -- Credit any pending referrer with a 30% next-renewal discount
  PERFORM public.grant_referral_discount_for(_user_id);

  RETURN jsonb_build_object(
    'ok', true,
    'subscription_id', _sub_id,
    'transaction_id', _tx_id,
    'new_balance', _balance,
    'period_end', _period_end,
    'amount_charged', _amount,
    'gross_amount', _gross,
    'discount_percent_applied', _discount
  );
END;
$$;

-- Re-grant execute (CREATE OR REPLACE preserves prior grants but be safe)
REVOKE ALL ON FUNCTION public.debit_wallet_for_subscription(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.debit_wallet_for_subscription(uuid, text, text) TO authenticated, service_role;

-- 5) When a rider/business account starts a free trial, still credit referrer
CREATE OR REPLACE FUNCTION public.credit_referrer_on_trial(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.grant_referral_discount_for(_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.credit_referrer_on_trial(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_referrer_on_trial(uuid) TO service_role;
