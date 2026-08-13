-- 1) Switch admin_list_registered_users to RETURN jsonb (avoids PostgREST 1000-row truncation on RETURNS TABLE)
DROP FUNCTION IF EXISTS public.admin_list_registered_users();

CREATE OR REPLACE FUNCTION public.admin_list_registered_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  _email text;
BEGIN
  BEGIN
    _email := lower(coalesce(auth.jwt() ->> 'email', ''));
  EXCEPTION WHEN OTHERS THEN _email := '';
  END;
  IF _email = '' OR NOT public.is_super_admin(_email) THEN
    RAISE EXCEPTION 'Not authorized: super admin only';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.signed_up_at DESC)
    FROM (
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
        u.created_at AS signed_up_at,
        COALESCE(r.is_banned, false) AS is_banned,
        r.ban_reason
      FROM auth.users u
      LEFT JOIN public.riders r ON r.user_id = u.id
    ) t
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_registered_users() TO authenticated, service_role;

-- 2) Share gate should only apply to individual accounts (not super admins),
--    matching create_withdrawal_request which only enforces it for is_individual_account.
CREATE OR REPLACE FUNCTION public.get_share_gate_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _total int;
  _is_individual boolean;
  _applies boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;
  SELECT count(DISTINCT recipient_phone) INTO _total
  FROM public.whatsapp_shares WHERE user_id = _uid;
  _is_individual := public.is_individual_account(_uid);
  _applies := _is_individual;  -- super admins / businesses / riders are NOT gated
  RETURN jsonb_build_object(
    'authenticated', true,
    'is_individual', _is_individual,
    'total_shares', _total,
    'required', 10,
    'remaining', GREATEST(0, 10 - _total),
    'gate_passed', (_total >= 10) OR NOT _applies,
    'applies', _applies
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_share_gate_status() TO authenticated;