
-- 1. admin_get_referral_signup_details — add super-admin gate, revoke anon
CREATE OR REPLACE FUNCTION public.admin_get_referral_signup_details(_referral_code text)
RETURNS TABLE(user_id uuid, email text, full_name text, phone text, account_type text, country text, signed_up_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin_caller() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT
      u.id AS user_id,
      u.email::text,
      COALESCE(r.full_name, u.raw_user_meta_data->>'full_name') AS full_name,
      r.phone,
      COALESCE(r.account_type, 'rider') AS account_type,
      r.country,
      u.created_at AS signed_up_at
    FROM public.user_referral_balances urb
    JOIN auth.users u ON u.id = urb.user_id
    LEFT JOIN public.riders r ON r.user_id = u.id
    WHERE urb.migrated_from_device_id IN (
      SELECT referred_device_id FROM public.device_referral_claims
       WHERE referrer_code = _referral_code
    )
    ORDER BY u.created_at DESC
    LIMIT 500;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_get_referral_signup_details(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_signup_details(text) TO authenticated;

-- 2. admin_get_referral_history — add super-admin gate
CREATE OR REPLACE FUNCTION public.admin_get_referral_history(_referral_code text)
RETURNS TABLE(id uuid, amount integer, trigger_event text, referred_device_id text, referred_ip text, created_at timestamp with time zone, referred_email text, referred_name text, referred_phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin_caller() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT
      c.id,
      c.amount,
      c.trigger_event,
      c.referred_device_id,
      c.referred_ip,
      c.created_at,
      u.email::text AS referred_email,
      COALESCE(r.full_name, u.raw_user_meta_data->>'full_name') AS referred_name,
      r.phone AS referred_phone
    FROM public.device_referral_claims c
    LEFT JOIN public.user_referral_balances urb
      ON urb.migrated_from_device_id = c.referred_device_id
    LEFT JOIN auth.users u ON u.id = urb.user_id
    LEFT JOIN public.riders r ON r.user_id = u.id
    WHERE c.referrer_code = _referral_code
    ORDER BY c.created_at DESC
    LIMIT 500;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_get_referral_history(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_history(text) TO authenticated;

-- 3. admin_list_referral_accounts — add super-admin gate, revoke anon
CREATE OR REPLACE FUNCTION public.admin_list_referral_accounts(_limit integer DEFAULT 200, _offset integer DEFAULT 0, _search text DEFAULT NULL::text)
RETURNS TABLE(source text, identifier text, referral_code text, balance integer, total_earned integer, total_referrals integer, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin_caller() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    WITH combined AS (
      SELECT 'user'::text AS source,
             urb.user_id::text AS identifier,
             urb.referral_code,
             urb.balance,
             urb.total_earned,
             urb.total_referrals,
             urb.created_at,
             urb.updated_at
        FROM public.user_referral_balances urb
      UNION ALL
      SELECT 'device'::text AS source,
             dr.device_id AS identifier,
             dr.referral_code,
             dr.balance,
             dr.total_earned,
             dr.total_referrals,
             dr.created_at,
             dr.updated_at
        FROM public.device_referrals dr
    )
    SELECT c.source, c.identifier, c.referral_code, c.balance, c.total_earned, c.total_referrals, c.created_at, c.updated_at
      FROM combined c
     WHERE _search IS NULL
        OR c.referral_code ILIKE '%' || _search || '%'
        OR c.identifier   ILIKE '%' || _search || '%'
     ORDER BY c.total_earned DESC, c.updated_at DESC
     LIMIT GREATEST(_limit, 1)
    OFFSET GREATEST(_offset, 0);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_list_referral_accounts(int, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_referral_accounts(int, int, text) TO authenticated;

-- 4. admin_get_referral_overview — add super-admin gate, revoke anon
REVOKE ALL ON FUNCTION public.admin_get_referral_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_overview() TO authenticated;

DO $$
DECLARE
  v_body text;
BEGIN
  SELECT prosrc INTO v_body FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='admin_get_referral_overview';
  IF position('is_super_admin_caller' IN v_body) = 0 THEN
    EXECUTE format($f$
      CREATE OR REPLACE FUNCTION public.admin_get_referral_overview()
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $body$
      BEGIN
        IF NOT public.is_super_admin_caller() THEN
          RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
        END IF;
        %s
      END;
      $body$;
    $f$, v_body);
  END IF;
END $$;
