CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  _type text, _full_name text, _network_provider text, _state_of_residence text,
  _address text, _postcode text, _amount integer,
  _ip_address text DEFAULT NULL::text, _phone text DEFAULT NULL::text
)
RETURNS withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _profile_phone text;
  _submitted_phone text;
  _final_phone text;
  _profile_name text;
  _is_banned boolean;
  _ban_reason text;
  _result public.withdrawals;
  _balance integer;
  _today_total integer;
  _daily_cap integer := 200;
  _share_total int;
  _is_super boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to withdraw';
  END IF;

  SELECT r.is_banned, r.ban_reason INTO _is_banned, _ban_reason
  FROM public.riders r WHERE r.user_id = _uid LIMIT 1;

  SELECT lower(u.email), public.is_super_admin(u.email)
  INTO _email, _is_super
  FROM auth.users u WHERE u.id = _uid AND u.email_confirmed_at IS NOT NULL;

  IF _email IS NULL THEN
    RAISE EXCEPTION 'You must verify your email before withdrawing';
  END IF;

  IF COALESCE(_is_banned, false) AND NOT _is_super THEN
    RAISE EXCEPTION 'Your account has been banned and cannot withdraw.%',
      CASE WHEN _ban_reason IS NOT NULL THEN ' Reason: ' || _ban_reason ELSE '' END;
  END IF;

  IF public.is_individual_account(_uid) OR _is_super THEN
    SELECT count(DISTINCT recipient_phone) INTO _share_total
    FROM public.whatsapp_shares WHERE user_id = _uid;
    IF _share_total < 10 THEN
      RAISE EXCEPTION 'SHARE_GATE_REQUIRED: Share Loca8tor on WhatsApp with 10 unique numbers to unlock withdrawals. You have completed % of 10.', _share_total;
    END IF;
  END IF;

  SELECT public.normalize_nigerian_phone(r.phone), r.full_name
  INTO _profile_phone, _profile_name
  FROM public.riders r WHERE r.user_id = _uid LIMIT 1;

  _submitted_phone := public.normalize_nigerian_phone(_phone);

  IF _submitted_phone ~ '^0[7-9][0-9]{9}$' THEN
    _final_phone := _submitted_phone;
  ELSE
    _final_phone := _profile_phone;
  END IF;

  IF _final_phone IS NOT NULL AND _final_phone ~ '^0[7-9][0-9]{9}$' THEN
    UPDATE public.riders SET phone = _final_phone
    WHERE user_id = _uid AND phone IS DISTINCT FROM _final_phone;
  END IF;

  IF (_final_phone IS NULL OR _final_phone !~ '^0[7-9][0-9]{9}$') AND NOT _is_super THEN
    RAISE EXCEPTION 'Your registered phone number (%) is not a valid Nigerian mobile number. Please correct it and try again.', coalesce(_profile_phone, '');
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

  IF NOT _is_super THEN
    SELECT COALESCE(SUM(amount), 0)::int INTO _today_total
    FROM public.withdrawals w
    WHERE lower(w.email) = _email
      AND w.created_at > now() - interval '24 hours'
      AND w.status NOT IN ('cancelled', 'rejected');

    IF _today_total + _amount > _daily_cap THEN
      RAISE EXCEPTION 'Daily withdrawal limit is ₦%. You have already requested ₦% in the last 24 hours.', _daily_cap, _today_total;
    END IF;
  END IF;

  PERFORM public.expire_old_quiz_credits(_uid);
  SELECT COALESCE(SUM(amount), 0)::integer INTO _balance
  FROM public.quiz_balance_ledger WHERE user_id = _uid;

  IF _balance < _amount AND NOT _is_super THEN
    RAISE EXCEPTION 'Insufficient balance. You have ₦% available (earnings expire 24 hours after they are earned).', _balance;
  END IF;

  INSERT INTO public.withdrawals (
    type, full_name, phone, email, network_provider,
    state_of_residence, address, postcode, amount, status, ip_address
  ) VALUES (
    _type,
    trim(coalesce(nullif(trim(coalesce(_full_name, '')), ''), _profile_name, 'Super Admin')),
    coalesce(_final_phone, '00000000000'), _email,
    trim(_network_provider), trim(_state_of_residence),
    trim(_address), upper(trim(_postcode)),
    _amount, 'pending',
    nullif(trim(coalesce(_ip_address, '')), '')
  )
  RETURNING * INTO _result;

  INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, withdrawal_id)
  VALUES (_uid, -_amount, 'withdrawal', _result.id);

  RETURN _result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_withdrawal_request(text, text, text, text, text, text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(text, text, text, text, text, text, integer, text, text) TO authenticated, service_role;