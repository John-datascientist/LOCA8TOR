CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  _type text, _full_name text, _network_provider text, _state_of_residence text,
  _address text, _postcode text, _amount integer,
  _ip_address text DEFAULT NULL::text
)
RETURNS withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _result public.withdrawals;
BEGIN
  SELECT * INTO _result
  FROM public.create_withdrawal_request(
    _type,
    _full_name,
    _network_provider,
    _state_of_residence,
    _address,
    _postcode,
    _amount,
    _ip_address,
    NULL::text
  );
  RETURN _result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_withdrawal_request(text, text, text, text, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(text, text, text, text, text, text, integer, text) TO authenticated, service_role;