
CREATE OR REPLACE FUNCTION public.credit_referrer_after_first_payment(_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rr public.rider_referrals;
  _reward int;
  _now timestamptz := now();
BEGIN
  SELECT * INTO _rr
  FROM public.rider_referrals
  WHERE referred_user_id = _referred_user_id
    AND status <> 'credited'
  ORDER BY created_at ASC
  LIMIT 1;

  IF _rr.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_pending_referral');
  END IF;

  IF _rr.account_type = 'business' THEN
    _reward := 2000;
  ELSIF _rr.account_type = 'rider' THEN
    _reward := 500;
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'unsupported_account_type');
  END IF;

  UPDATE public.rider_referrals
    SET status = 'credited',
        credits_earned = _reward,
        credited_at = _now,
        subscribed_at = COALESCE(subscribed_at, _now)
    WHERE id = _rr.id
      AND status <> 'credited';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_credited');
  END IF;

  INSERT INTO public.user_referral_balances (user_id, referral_code, balance, total_earned, total_referrals)
  VALUES (
    _rr.referrer_user_id,
    _rr.referral_code,
    _reward,
    _reward,
    1
  )
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.user_referral_balances.balance + _reward,
    total_earned = public.user_referral_balances.total_earned + _reward,
    total_referrals = public.user_referral_balances.total_referrals + 1,
    updated_at = _now;

  RETURN jsonb_build_object(
    'ok', true,
    'referrer_user_id', _rr.referrer_user_id,
    'reward_ngn', _reward,
    'referred_account_type', _rr.account_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_referrer_after_first_payment(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.debit_wallet_for_subscription(_user_id uuid, _plan_code text, _cycle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'Subscription: ' || _plan.name || ' (' || _cycle || ')',
    _sub_id
  ) RETURNING id INTO _tx_id;

  UPDATE public.riders SET subscription_status = 'active'
    WHERE user_id = _user_id;

  PERFORM public.credit_referrer_after_first_payment(_user_id);

  RETURN jsonb_build_object(
    'ok', true,
    'subscription_id', _sub_id,
    'transaction_id', _tx_id,
    'new_balance', _balance,
    'period_end', _period_end,
    'amount_charged', _amount
  );
END;
$function$;
