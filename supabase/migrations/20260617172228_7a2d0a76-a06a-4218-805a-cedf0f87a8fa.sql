
CREATE OR REPLACE FUNCTION public.process_due_subscription_renewals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _processed int := 0;
  _skipped_card int := 0;
  _results jsonb := '[]'::jsonb;
  _r jsonb;
  _has_stripe boolean;
BEGIN
  FOR _row IN
    SELECT id, business_user_id FROM public.business_subscriptions
    WHERE auto_renew = true
      AND status IN ('active','past_due')
      AND next_renewal_at IS NOT NULL
      AND next_renewal_at <= now()
    ORDER BY next_renewal_at ASC
    LIMIT 500
  LOOP
    -- Skip if last successful payment was a Stripe card subscription (paga_transaction_id like 'sub_…')
    SELECT EXISTS (
      SELECT 1 FROM public.subscription_payments
      WHERE user_id = _row.business_user_id
        AND status = 'paid'
        AND paga_transaction_id LIKE 'sub_%'
      ORDER BY paid_at DESC
      LIMIT 1
    ) INTO _has_stripe;

    IF _has_stripe THEN
      _skipped_card := _skipped_card + 1;
      CONTINUE;
    END IF;

    _r := public.process_subscription_renewal(_row.id);
    _results := _results || jsonb_build_object('id', _row.id, 'result', _r);
    _processed := _processed + 1;
  END LOOP;
  RETURN jsonb_build_object('processed', _processed, 'skipped_card', _skipped_card, 'results', _results);
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_subscription_renewals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_subscription_renewals() TO service_role;
