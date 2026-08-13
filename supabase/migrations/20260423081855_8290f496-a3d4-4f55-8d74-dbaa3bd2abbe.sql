-- =========================================================
-- Referral overview (super-admin / admin only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_get_referral_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_total_users  bigint := 0;
  v_user_total_earned bigint := 0;
  v_user_total_balance bigint := 0;
  v_user_total_referrals bigint := 0;
  v_dev_total_users  bigint := 0;
  v_dev_total_earned bigint := 0;
  v_dev_total_balance bigint := 0;
  v_dev_total_referrals bigint := 0;
  v_pending_withdraw_count bigint := 0;
  v_pending_withdraw_amount bigint := 0;
  v_completed_withdraw_amount bigint := 0;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(total_earned),0), COALESCE(SUM(balance),0), COALESCE(SUM(total_referrals),0)
    INTO v_user_total_users, v_user_total_earned, v_user_total_balance, v_user_total_referrals
    FROM public.user_referral_balances;

  SELECT COUNT(*), COALESCE(SUM(total_earned),0), COALESCE(SUM(balance),0), COALESCE(SUM(total_referrals),0)
    INTO v_dev_total_users, v_dev_total_earned, v_dev_total_balance, v_dev_total_referrals
    FROM public.device_referrals;

  SELECT COUNT(*), COALESCE(SUM(amount),0)
    INTO v_pending_withdraw_count, v_pending_withdraw_amount
    FROM public.withdrawals
    WHERE status = 'pending';

  SELECT COALESCE(SUM(amount),0)
    INTO v_completed_withdraw_amount
    FROM public.withdrawals
    WHERE status = 'completed';

  RETURN jsonb_build_object(
    'user_accounts', v_user_total_users,
    'device_accounts', v_dev_total_users,
    'total_accounts', v_user_total_users + v_dev_total_users,
    'total_earned', v_user_total_earned + v_dev_total_earned,
    'total_balance', v_user_total_balance + v_dev_total_balance,
    'total_referrals', v_user_total_referrals + v_dev_total_referrals,
    'pending_withdraw_count', v_pending_withdraw_count,
    'pending_withdraw_amount', v_pending_withdraw_amount,
    'completed_withdraw_amount', v_completed_withdraw_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_referral_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_overview() TO anon, authenticated;

-- =========================================================
-- Referral accounts list (combined view)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_list_referral_accounts(
  _limit int DEFAULT 200,
  _offset int DEFAULT 0,
  _search text DEFAULT NULL
)
RETURNS TABLE (
  source text,
  identifier text,
  referral_code text,
  balance integer,
  total_earned integer,
  total_referrals integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH combined AS (
    SELECT 'user'::text AS source,
           user_id::text AS identifier,
           referral_code,
           balance,
           total_earned,
           total_referrals,
           created_at,
           updated_at
      FROM public.user_referral_balances
    UNION ALL
    SELECT 'device'::text AS source,
           device_id AS identifier,
           referral_code,
           balance,
           total_earned,
           total_referrals,
           created_at,
           updated_at
      FROM public.device_referrals
  )
  SELECT *
    FROM combined
   WHERE _search IS NULL
      OR referral_code ILIKE '%' || _search || '%'
      OR identifier   ILIKE '%' || _search || '%'
   ORDER BY total_earned DESC, updated_at DESC
   LIMIT GREATEST(_limit, 1)
  OFFSET GREATEST(_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.admin_list_referral_accounts(int, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_referral_accounts(int, int, text) TO anon, authenticated;

-- =========================================================
-- Referral history for a single code
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_get_referral_history(_referral_code text)
RETURNS TABLE (
  id uuid,
  amount integer,
  trigger_event text,
  referred_device_id text,
  referred_ip text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, amount, trigger_event, referred_device_id, referred_ip, created_at
    FROM public.device_referral_claims
   WHERE referrer_code = _referral_code
   ORDER BY created_at DESC
   LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.admin_get_referral_history(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_history(text) TO anon, authenticated;

-- =========================================================
-- Super-admin: change any admin_staff PIN (by id)
-- =========================================================
CREATE OR REPLACE FUNCTION public.super_admin_set_staff_pin(
  _admin_email text,
  _staff_id uuid,
  _new_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(_admin_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorised');
  END IF;
  IF _new_pin IS NULL OR length(trim(_new_pin)) <> 7 OR _new_pin !~ '^[0-9]{7}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PIN must be exactly 7 digits');
  END IF;
  UPDATE public.admin_staff
     SET pin = _new_pin
   WHERE id = _staff_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff not found');
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_set_staff_pin(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_set_staff_pin(text, uuid, text) TO anon, authenticated;

-- =========================================================
-- Admin staff: change own PIN (must supply current PIN)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_staff_change_pin(
  _email text,
  _current_pin text,
  _new_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _new_pin IS NULL OR length(trim(_new_pin)) <> 7 OR _new_pin !~ '^[0-9]{7}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'New PIN must be exactly 7 digits');
  END IF;
  SELECT id INTO v_id
    FROM public.admin_staff
   WHERE lower(email) = lower(trim(_email))
     AND pin = _current_pin
     AND is_active = true
   LIMIT 1;
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current PIN is incorrect');
  END IF;
  UPDATE public.admin_staff SET pin = _new_pin WHERE id = v_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_staff_change_pin(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_staff_change_pin(text, text, text) TO anon, authenticated;