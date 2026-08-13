
-- 1) Strict uniqueness on rider phone (normalized) at the DB level
CREATE OR REPLACE FUNCTION public.riders_enforce_unique_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text;
  _exists uuid;
BEGIN
  _norm := regexp_replace(coalesce(NEW.phone, ''), '\s+', '', 'g');
  IF length(_norm) < 6 THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _exists
  FROM public.riders
  WHERE regexp_replace(coalesce(phone,''), '\s+', '', 'g') = _norm
    AND id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;

  IF _exists IS NOT NULL THEN
    RAISE EXCEPTION 'phone_already_registered' USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_riders_enforce_unique_phone ON public.riders;
CREATE TRIGGER trg_riders_enforce_unique_phone
BEFORE INSERT OR UPDATE OF phone ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.riders_enforce_unique_phone();

-- 2) Admin ban-by-email helper (used from withdrawal row)
CREATE OR REPLACE FUNCTION public.admin_ban_account_by_email(p_email text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _caller_email text;
BEGIN
  _caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF NOT public.is_super_admin(_caller_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  RETURN public.admin_ban_account(_uid, p_reason);
END;
$$;
