CREATE OR REPLACE FUNCTION public.get_share_gate_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _total int;
  _is_individual boolean;
  _email text;
  _is_super boolean := false;
  _applies boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;
  SELECT count(DISTINCT recipient_phone) INTO _total
  FROM public.whatsapp_shares WHERE user_id = _uid;
  _is_individual := public.is_individual_account(_uid);
  SELECT lower(u.email) INTO _email FROM auth.users u WHERE u.id = _uid;
  _is_super := public.is_super_admin(_email);
  _applies := _is_individual OR _is_super;
  RETURN jsonb_build_object(
    'authenticated', true,
    'is_individual', _is_individual,
    'total_shares', _total,
    'required', 10,
    'remaining', GREATEST(0, 10 - _total),
    'gate_passed', (_total >= 10) OR NOT _applies,
    'applies', _applies
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_share_gate_status() TO authenticated;