
-- ============================================================
-- Admin: list withdrawal candidates
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_withdrawal_candidates(
  _min_balance integer DEFAULT 0,
  _only_with_history boolean DEFAULT false,
  _limit integer DEFAULT 500
)
RETURNS TABLE (
  user_id uuid,
  email text,
  email_verified boolean,
  full_name text,
  phone text,
  referral_balance integer,
  total_earned integer,
  withdrawal_count integer,
  last_withdrawal_at timestamptz,
  last_withdrawal_status text,
  last_full_name text,
  last_phone text,
  last_network text,
  last_state text,
  last_address text,
  last_postcode text,
  last_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_super_admin(COALESCE(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'Only super admins can list withdrawal candidates';
  END IF;

  RETURN QUERY
  WITH last_wd AS (
    SELECT DISTINCT ON (lower(w.email))
      lower(w.email) AS email_lc,
      w.created_at,
      w.status,
      w.full_name,
      w.phone,
      w.network_provider,
      w.state_of_residence,
      w.address,
      w.postcode,
      w.type
    FROM public.withdrawals w
    ORDER BY lower(w.email), w.created_at DESC
  ),
  wd_counts AS (
    SELECT lower(email) AS email_lc, count(*)::int AS c
    FROM public.withdrawals
    GROUP BY lower(email)
  )
  SELECT
    u.id AS user_id,
    u.email,
    (u.email_confirmed_at IS NOT NULL) AS email_verified,
    COALESCE(r.full_name, lw.full_name) AS full_name,
    COALESCE(r.phone, lw.phone) AS phone,
    COALESCE(b.balance, 0) AS referral_balance,
    COALESCE(b.total_earned, 0) AS total_earned,
    COALESCE(wc.c, 0) AS withdrawal_count,
    lw.created_at AS last_withdrawal_at,
    lw.status AS last_withdrawal_status,
    lw.full_name AS last_full_name,
    lw.phone AS last_phone,
    lw.network_provider AS last_network,
    lw.state_of_residence AS last_state,
    lw.address AS last_address,
    lw.postcode AS last_postcode,
    lw.type AS last_type
  FROM auth.users u
  LEFT JOIN public.user_referral_balances b ON b.user_id = u.id
  LEFT JOIN public.riders r ON r.user_id = u.id
  LEFT JOIN last_wd lw ON lw.email_lc = lower(u.email)
  LEFT JOIN wd_counts wc ON wc.email_lc = lower(u.email)
  WHERE u.email_confirmed_at IS NOT NULL
    AND COALESCE(b.balance, 0) >= COALESCE(_min_balance, 0)
    AND (_only_with_history = false OR wc.c IS NOT NULL)
  ORDER BY COALESCE(b.balance, 0) DESC, lw.created_at DESC NULLS LAST
  LIMIT COALESCE(_limit, 500);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_withdrawal_candidates(integer, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_withdrawal_candidates(integer, boolean, integer) TO authenticated;

-- ============================================================
-- Admin: create a pending withdrawal on behalf of a user
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_create_pending_withdrawal(
  _email text,
  _type text,
  _full_name text,
  _phone text,
  _network_provider text,
  _state_of_residence text,
  _address text,
  _postcode text,
  _amount integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _admin_email text := COALESCE(auth.jwt() ->> 'email', '');
  _new_id uuid;
BEGIN
  IF NOT public.is_super_admin(_admin_email) THEN
    RAISE EXCEPTION 'Only super admins can create withdrawals on behalf of users';
  END IF;

  IF _type NOT IN ('airtime', 'data') THEN
    RAISE EXCEPTION 'Type must be airtime or data';
  END IF;
  IF _amount IS NULL OR _amount < 50 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Amount must be between 50 and 100000';
  END IF;
  IF length(trim(coalesce(_full_name, ''))) = 0
     OR length(trim(coalesce(_phone, ''))) < 10
     OR length(trim(coalesce(_email, ''))) < 3
     OR length(trim(coalesce(_network_provider, ''))) = 0
     OR length(trim(coalesce(_state_of_residence, ''))) = 0
     OR length(trim(coalesce(_address, ''))) = 0
     OR length(trim(coalesce(_postcode, ''))) = 0 THEN
    RAISE EXCEPTION 'All fields are required';
  END IF;

  INSERT INTO public.withdrawals (
    type, full_name, phone, email, network_provider,
    state_of_residence, address, postcode, amount, status, ip_address
  ) VALUES (
    _type, trim(_full_name), trim(_phone), lower(trim(_email)), trim(_network_provider),
    trim(_state_of_residence), trim(_address), upper(trim(_postcode)), _amount, 'pending', 'admin:' || _admin_email
  )
  RETURNING id INTO _new_id;

  INSERT INTO public.admin_audit_log (actor_email, action, target, metadata)
  VALUES (
    _admin_email,
    'create_pending_withdrawal',
    _new_id::text,
    jsonb_build_object(
      'email', lower(trim(_email)),
      'amount', _amount,
      'type', _type,
      'network', _network_provider
    )
  );

  RETURN _new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_pending_withdrawal(text, text, text, text, text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_pending_withdrawal(text, text, text, text, text, text, text, text, integer) TO authenticated;
