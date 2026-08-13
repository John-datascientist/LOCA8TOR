
-- Returns signup details for the user(s) tied to a given referral code.
-- Looks at user_referral_balances (preferred) and falls back to riders.referral_code.
CREATE OR REPLACE FUNCTION public.admin_get_referral_signup_details(_referral_code text)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  account_type text,
  country text,
  signed_up_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    COALESCE(r.full_name, (u.raw_user_meta_data->>'full_name')) AS full_name,
    r.phone,
    COALESCE(r.account_type, 'individual') AS account_type,
    COALESCE(u.raw_user_meta_data->>'country', NULL) AS country,
    u.created_at AS signed_up_at
  FROM auth.users u
  LEFT JOIN public.riders r ON r.user_id = u.id
  WHERE
    u.id IN (
      SELECT urb.user_id FROM public.user_referral_balances urb
      WHERE urb.referral_code = _referral_code
    )
    OR r.referral_code = _referral_code
  ORDER BY u.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_referral_signup_details(text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_signup_details(text) TO authenticated, anon;
