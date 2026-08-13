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
#variable_conflict use_column
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
    SELECT lower(w.email) AS email_lc, count(*)::int AS c
    FROM public.withdrawals w
    GROUP BY lower(w.email)
  )
  SELECT
    u.id AS user_id,
    u.email::text AS email,
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