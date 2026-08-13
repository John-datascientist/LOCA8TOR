CREATE OR REPLACE FUNCTION public.update_withdrawal_status(_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('pending', 'completed', 'rejected', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  IF NOT public.is_super_admin((auth.jwt() ->> 'email')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.withdrawals
     SET status = _status
   WHERE id = _id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_withdrawal_status(
  _id uuid,
  _status text,
  _admin_email text,
  _admin_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  IF _status NOT IN ('pending', 'completed', 'rejected', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  SELECT id INTO _admin_id
  FROM public.admin_staff
  WHERE lower(coalesce(email, '')) = lower(coalesce(_admin_email, ''))
    AND pin = coalesce(_admin_pin, '')
    AND is_active = true
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.withdrawals
     SET status = _status
   WHERE id = _id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true, 'admin_id', _admin_id);
END;
$$;

REVOKE ALL ON FUNCTION public.update_withdrawal_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_withdrawal_status(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_withdrawal_status(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_withdrawal_status(uuid, text, text, text) TO anon, authenticated;