
-- Change expiry window from 48h to 24h
CREATE OR REPLACE FUNCTION public.expire_old_quiz_credits(_uid uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  _old_credits integer;
  _consumed integer;
  _to_expire integer;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id
    FROM public.quiz_balance_ledger
    WHERE (_uid IS NULL OR user_id = _uid)
  LOOP
    SELECT COALESCE(SUM(amount), 0)::int INTO _old_credits
    FROM public.quiz_balance_ledger
    WHERE user_id = r.user_id
      AND reason = 'quiz_score'
      AND created_at < now() - interval '24 hours';

    SELECT
      COALESCE(-SUM(amount) FILTER (WHERE reason IN ('withdrawal','expiry') AND amount < 0), 0)::int
      - COALESCE(SUM(amount) FILTER (WHERE reason = 'withdrawal_reversal'), 0)::int
      INTO _consumed
    FROM public.quiz_balance_ledger
    WHERE user_id = r.user_id;

    _to_expire := GREATEST(0, _old_credits - _consumed);

    IF _to_expire > 0 THEN
      INSERT INTO public.quiz_balance_ledger (user_id, amount, reason, notes)
      VALUES (r.user_id, -_to_expire, 'expiry', '24h auto-expiry');
    END IF;
  END LOOP;
END;
$$;

-- Add ₦200/day cap and update expiry messaging
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  _type text, _full_name text, _network_provider text, _state_of_residence text,
  _address text, _postcode text, _amount integer,
  _ip_address text DEFAULT NULL::text, _phone text DEFAULT NULL::text
)
RETURNS withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to withdraw';
  END IF;

  SELECT r.is_banned, r.ban_reason
  INTO _is_banned, _ban_reason
  FROM public.riders r
  WHERE r.user_id = _uid
  LIMIT 1;

  IF COALESCE(_is_banned, false) THEN
    RAISE EXCEPTION 'Your account has been banned and cannot withdraw.%',
      CASE WHEN _ban_reason IS NOT NULL THEN ' Reason: ' || _ban_reason ELSE '' END;
  END IF;

  SELECT lower(u.email) INTO _email
  FROM auth.users u
  WHERE u.id = _uid AND u.email_confirmed_at IS NOT NULL;

  IF _email IS NULL THEN
    RAISE EXCEPTION 'You must verify your email before withdrawing';
  END IF;

  SELECT public.normalize_nigerian_phone(r.phone), r.full_name
  INTO _profile_phone, _profile_name
  FROM public.riders r
  WHERE r.user_id = _uid
  LIMIT 1;

  _submitted_phone := public.normalize_nigerian_phone(_phone);

  IF _submitted_phone ~ '^0[7-9][0-9]{9}$' THEN
    _final_phone := _submitted_phone;
  ELSE
    _final_phone := _profile_phone;
  END IF;

  IF _final_phone IS NOT NULL AND _final_phone ~ '^0[7-9][0-9]{9}$' THEN
    UPDATE public.riders
    SET phone = _final_phone
    WHERE user_id = _uid AND phone IS DISTINCT FROM _final_phone;
  END IF;

  IF _final_phone IS NULL OR _final_phone !~ '^0[7-9][0-9]{9}$' THEN
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

  -- Daily withdrawal cap: ₦200 in any rolling 24h window (excluding cancelled/rejected)
  SELECT COALESCE(SUM(amount), 0)::int INTO _today_total
  FROM public.withdrawals w
  JOIN public.riders r ON r.user_id = _uid
  WHERE lower(w.email) = _email
    AND w.created_at > now() - interval '24 hours'
    AND w.status NOT IN ('cancelled', 'rejected');

  IF _today_total + _amount > _daily_cap THEN
    RAISE EXCEPTION 'Daily withdrawal limit is ₦%. You have already requested ₦% in the last 24 hours.', _daily_cap, _today_total;
  END IF;

  PERFORM public.expire_old_quiz_credits(_uid);
  SELECT COALESCE(SUM(amount), 0)::integer INTO _balance
  FROM public.quiz_balance_ledger
  WHERE user_id = _uid;

  IF _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance. You have ₦% available (earnings expire 24h after they are earned).', _balance;
  END IF;

  INSERT INTO public.withdrawals (
    type, full_name, phone, email, network_provider,
    state_of_residence, address, postcode, amount, status, ip_address
  ) VALUES (
    _type,
    trim(coalesce(nullif(trim(coalesce(_full_name, '')), ''), _profile_name)),
    _final_phone, _email,
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
