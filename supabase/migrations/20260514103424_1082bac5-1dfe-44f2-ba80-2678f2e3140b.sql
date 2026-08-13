CREATE OR REPLACE FUNCTION public.admin_list_registered_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  phone text,
  account_type text,
  business_name text,
  business_code text,
  cac_number text,
  postcode text,
  location text,
  referral_code text,
  subscription_status text,
  email_verified boolean,
  signed_up_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    COALESCE(r.full_name, (u.raw_user_meta_data->>'full_name')) AS full_name,
    r.phone,
    COALESCE(r.account_type, 'individual') AS account_type,
    r.business_name,
    r.business_code,
    r.cac_number,
    r.postcode,
    r.location,
    r.referral_code,
    COALESCE(r.subscription_status, 'none') AS subscription_status,
    (u.email_confirmed_at IS NOT NULL) AS email_verified,
    u.created_at AS signed_up_at
  FROM auth.users u
  LEFT JOIN public.riders r ON r.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;