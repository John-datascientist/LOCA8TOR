CREATE OR REPLACE FUNCTION public.update_withdrawal_status(_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _status NOT IN ('pending', 'completed', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
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

REVOKE ALL ON FUNCTION public.update_withdrawal_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_withdrawal_status(uuid, text) TO anon, authenticated;