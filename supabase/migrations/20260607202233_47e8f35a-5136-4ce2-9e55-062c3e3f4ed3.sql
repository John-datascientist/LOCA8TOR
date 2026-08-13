CREATE OR REPLACE FUNCTION public.get_share_gate_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _total int;
  _is_individual boolean;
  _applies boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;
  SELECT count(DISTINCT recipient_phone) INTO _total
  FROM public.whatsapp_shares WHERE user_id = _uid;
  _is_individual := public.is_individual_account(_uid);
  -- Re-enable the share gate for all account types so that everyone is
  -- encouraged to share before withdrawing. This drives referral growth
  -- (riders/business get ₦500 per referral, individuals ₦100).
  _applies := true;
  RETURN jsonb_build_object(
    'authenticated', true,
    'is_individual', _is_individual,
    'total_shares', _total,
    'required', 10,
    'remaining', GREATEST(0, 10 - _total),
    'gate_passed', (_total >= 10),
    'applies', _applies
  );
END;
$function$;