CREATE OR REPLACE FUNCTION public.claim_device_referral(_referrer_code text, _referred_device_id text, _referred_ip text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _referrer device_referrals;
  _amount   INTEGER := 100;
  _ip_block TEXT;
  _today_count INTEGER;
BEGIN
  IF _referrer_code IS NULL OR length(trim(_referrer_code)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  IF _referred_device_id IS NULL OR length(trim(_referred_device_id)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_device');
  END IF;

  SELECT * INTO _referrer
  FROM device_referrals
  WHERE referral_code = _referrer_code
  FOR UPDATE;

  IF _referrer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF _referrer.device_id = _referred_device_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  IF _referrer.ip_address IS NOT NULL
     AND _referred_ip IS NOT NULL
     AND _referred_ip <> 'unknown'
     AND _referrer.ip_address = _referred_ip THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral_ip');
  END IF;

  IF EXISTS (SELECT 1 FROM device_referral_claims WHERE referred_device_id = _referred_device_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  -- The referred device already has its own referral account.
  -- Only block if it's clearly an existing/long-time user (older than 7 days).
  -- Most referred friends visit /refer or generate within a few days of clicking the link,
  -- so a 7-day grace window keeps the referral fair without rewarding old accounts.
  IF EXISTS (SELECT 1 FROM device_referrals WHERE device_id = _referred_device_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM device_referrals
      WHERE device_id = _referred_device_id
        AND created_at > now() - interval '7 days'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'existing_user');
    END IF;
  END IF;

  IF _referred_ip IS NOT NULL AND _referred_ip <> 'unknown' THEN
    IF EXISTS (SELECT 1 FROM device_referral_claims WHERE referred_ip = _referred_ip) THEN
      RETURN jsonb_build_object('success', false, 'error', 'ip_already_used');
    END IF;

    _ip_block := regexp_replace(_referred_ip, '\.\d+$', '');
    SELECT count(*) INTO _today_count
    FROM device_referral_claims
    WHERE referrer_code = _referrer_code
      AND created_at > now() - interval '24 hours'
      AND referred_ip LIKE _ip_block || '%';
    IF _today_count >= 50 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
    END IF;
  END IF;

  INSERT INTO device_referral_claims (
    referrer_code, referrer_device_id, referred_device_id, referred_ip, amount
  ) VALUES (
    _referrer_code, _referrer.device_id, _referred_device_id, _referred_ip, _amount
  );

  UPDATE device_referrals
     SET balance = balance + _amount,
         total_earned = total_earned + _amount,
         total_referrals = total_referrals + 1,
         updated_at = now()
   WHERE id = _referrer.id;

  RETURN jsonb_build_object('success', true, 'amount', _amount);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
END;
$function$;