
-- Cutoff: riders created before this date are grandfathered (allowed without a business link)
-- 2026-05-31

-- 1) Validate a business code: returns ok + business_user_id if the owning business
-- is on an active/trialing subscription and not banned.
CREATE OR REPLACE FUNCTION public.validate_business_code(p_code text)
RETURNS TABLE(ok boolean, business_user_id uuid, message text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz public.riders%ROWTYPE;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Business code is required'::text;
    RETURN;
  END IF;

  SELECT * INTO biz FROM public.riders
    WHERE business_code = upper(trim(p_code))
      AND account_type = 'business'
    LIMIT 1;

  IF biz.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Business code not found'::text;
    RETURN;
  END IF;

  IF biz.is_banned THEN
    RETURN QUERY SELECT false, NULL::uuid, 'This business is suspended'::text;
    RETURN;
  END IF;

  IF COALESCE(biz.subscription_status, 'none') NOT IN ('active','trialing','trial') THEN
    RETURN QUERY SELECT false, NULL::uuid, 'This business does not have an active subscription'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, biz.id, 'ok'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_business_code(text) TO anon, authenticated, service_role;

-- 2) Link the calling rider's account to a business via the business code.
CREATE OR REPLACE FUNCTION public.link_rider_to_business(p_code text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rider public.riders%ROWTYPE;
  v_validation RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::text; RETURN;
  END IF;

  SELECT * INTO v_rider FROM public.riders WHERE user_id = v_user_id LIMIT 1;
  IF v_rider.id IS NULL THEN
    RETURN QUERY SELECT false, 'Rider profile not found'::text; RETURN;
  END IF;
  IF v_rider.account_type = 'business' THEN
    RETURN QUERY SELECT false, 'Business accounts cannot join other businesses'::text; RETURN;
  END IF;

  SELECT * INTO v_validation FROM public.validate_business_code(p_code);
  IF NOT v_validation.ok THEN
    RETURN QUERY SELECT false, v_validation.message; RETURN;
  END IF;

  -- Insert link if not already present
  IF NOT EXISTS (
    SELECT 1 FROM public.business_riders
    WHERE linked_rider_id = v_rider.id AND business_user_id = v_validation.business_user_id
  ) THEN
    INSERT INTO public.business_riders (
      business_user_id, linked_rider_id, rider_name, rider_phone, email, status
    ) VALUES (
      v_validation.business_user_id, v_rider.id, v_rider.full_name, v_rider.phone,
      (SELECT email FROM auth.users WHERE id = v_user_id), 'active'
    );
  END IF;

  RETURN QUERY SELECT true, 'Linked successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_rider_to_business(text) TO authenticated, service_role;

-- 3) Effective subscription status for the calling user.
-- For business accounts: their own riders.subscription_status.
-- For rider accounts linked to a business: the parent business's subscription_status.
-- For unlinked riders: their own status (typically 'none').
CREATE OR REPLACE FUNCTION public.get_effective_subscription_status(p_user_id uuid)
RETURNS TABLE(
  effective_status text,
  account_type text,
  is_linked boolean,
  is_grandfathered boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rider public.riders%ROWTYPE;
  v_parent public.riders%ROWTYPE;
  v_link_business_id uuid;
  v_cutoff timestamptz := '2026-05-31 00:00:00+00';
BEGIN
  SELECT * INTO v_rider FROM public.riders WHERE user_id = p_user_id LIMIT 1;
  IF v_rider.id IS NULL THEN
    RETURN QUERY SELECT 'none'::text, NULL::text, false, false; RETURN;
  END IF;

  IF v_rider.account_type = 'business' THEN
    RETURN QUERY SELECT COALESCE(v_rider.subscription_status,'none'), 'business'::text, false,
                        (v_rider.created_at < v_cutoff);
    RETURN;
  END IF;

  SELECT business_user_id INTO v_link_business_id FROM public.business_riders
    WHERE linked_rider_id = v_rider.id
    ORDER BY created_at DESC LIMIT 1;

  IF v_link_business_id IS NULL THEN
    RETURN QUERY SELECT COALESCE(v_rider.subscription_status,'none'),
                        v_rider.account_type, false, (v_rider.created_at < v_cutoff);
    RETURN;
  END IF;

  SELECT * INTO v_parent FROM public.riders WHERE id = v_link_business_id LIMIT 1;
  RETURN QUERY SELECT COALESCE(v_parent.subscription_status,'none'),
                      v_rider.account_type, true, (v_rider.created_at < v_cutoff);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_subscription_status(uuid) TO authenticated, service_role;
