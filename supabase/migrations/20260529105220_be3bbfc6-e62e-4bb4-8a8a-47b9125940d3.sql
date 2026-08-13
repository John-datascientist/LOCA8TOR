CREATE OR REPLACE FUNCTION public.normalize_nigerian_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _digits text;
BEGIN
  _digits := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');

  IF length(_digits) = 13 AND left(_digits, 3) = '234' THEN
    RETURN '0' || substr(_digits, 4);
  END IF;

  IF length(_digits) = 11 AND left(_digits, 1) = '0' THEN
    RETURN _digits;
  END IF;

  IF length(_digits) = 10 AND left(_digits, 1) IN ('7', '8', '9') THEN
    RETURN '0' || _digits;
  END IF;

  RETURN _digits;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.normalize_nigerian_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_nigerian_phone(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  _type text,
  _full_name text,
  _network_provider text,
  _state_of_residence text,
  _address text,
  _postcode text,
  _amount integer,
  _ip_address text DEFAULT NULL
)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _profile_phone text;
  _profile_name text;
  _result public.withdrawals;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to withdraw';
  END IF;

  SELECT lower(u.email)
  INTO _email
  FROM auth.users u
  WHERE u.id = _uid
    AND u.email_confirmed_at IS NOT NULL;

  IF _email IS NULL THEN
    RAISE EXCEPTION 'You must verify your email before withdrawing';
  END IF;

  SELECT public.normalize_nigerian_phone(r.phone), r.full_name
  INTO _profile_phone, _profile_name
  FROM public.riders r
  WHERE r.user_id = _uid
  LIMIT 1;

  IF _profile_phone IS NOT NULL AND _profile_phone ~ '^0[7-9][0-9]{9}$' THEN
    UPDATE public.riders
    SET phone = _profile_phone
    WHERE user_id = _uid
      AND phone IS DISTINCT FROM _profile_phone;
  END IF;

  IF _profile_phone IS NULL OR _profile_phone !~ '^0[7-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Your registered phone number (%) is not a valid Nigerian mobile number. Please contact support to update it.', coalesce(_profile_phone, '');
  END IF;

  IF _type NOT IN ('airtime', 'data') THEN
    RAISE EXCEPTION 'Choose airtime or data';
  END IF;

  IF _amount IS NULL OR _amount < 50 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Withdrawal amount is outside the allowed range';
  END IF;

  IF length(trim(coalesce(_network_provider, ''))) = 0
     OR length(trim(coalesce(_state_of_residence, ''))) = 0
     OR length(trim(coalesce(_address, ''))) = 0
     OR length(trim(coalesce(_postcode, ''))) = 0 THEN
    RAISE EXCEPTION 'Complete all withdrawal details';
  END IF;

  INSERT INTO public.withdrawals (
    type, full_name, phone, email, network_provider,
    state_of_residence, address, postcode, amount, status, ip_address
  ) VALUES (
    _type,
    trim(coalesce(nullif(trim(coalesce(_full_name, '')), ''), _profile_name)),
    _profile_phone,
    _email,
    trim(_network_provider),
    trim(_state_of_residence),
    trim(_address),
    upper(trim(_postcode)),
    _amount,
    'pending',
    nullif(trim(coalesce(_ip_address, '')), '')
  )
  RETURNING * INTO _result;

  RETURN _result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_withdrawal_request(text, text, text, text, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(text, text, text, text, text, text, integer, text) TO authenticated, service_role;

UPDATE public.riders r
SET phone = public.normalize_nigerian_phone(r.phone)
WHERE r.phone IS NOT NULL
  AND public.normalize_nigerian_phone(r.phone) ~ '^0[7-9][0-9]{9}$'
  AND r.phone IS DISTINCT FROM public.normalize_nigerian_phone(r.phone);