
-- Wrapper to process all due subscription renewals in one call (idempotent)
CREATE OR REPLACE FUNCTION public.process_due_subscription_renewals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _processed int := 0;
  _results jsonb := '[]'::jsonb;
  _r jsonb;
BEGIN
  FOR _row IN
    SELECT id FROM public.business_subscriptions
    WHERE auto_renew = true
      AND status IN ('active','past_due')
      AND next_renewal_at IS NOT NULL
      AND next_renewal_at <= now()
    ORDER BY next_renewal_at ASC
    LIMIT 500
  LOOP
    _r := public.process_subscription_renewal(_row.id);
    _results := _results || jsonb_build_object('id', _row.id, 'result', _r);
    _processed := _processed + 1;
  END LOOP;
  RETURN jsonb_build_object('processed', _processed, 'results', _results);
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_subscription_renewals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_subscription_renewals() TO service_role;

-- Schedule it hourly via pg_cron (runs at minute 7 of every hour)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-subscription-renewals-hourly') THEN
    PERFORM cron.unschedule('process-subscription-renewals-hourly');
  END IF;
  PERFORM cron.schedule(
    'process-subscription-renewals-hourly',
    '7 * * * *',
    $cron$ SELECT public.process_due_subscription_renewals(); $cron$
  );
END $$;
