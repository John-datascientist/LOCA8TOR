import { supabase } from '@/integrations/supabase/client';
import { getDeviceId, getStableDeviceId, getStoredDeviceId } from './deviceId';
import { getUserIp } from './ipAddress';

const PENDING_REF_KEY = 'loca8tor-pending-ref';
const CLAIMED_KEY = 'loca8tor-ref-claimed';

function genCode(): string {
  return `LOC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function getKnownReferralCode(): string | null {
  try {
    return localStorage.getItem('loca8tor-referral-code');
  } catch {
    return null;
  }
}

function setKnownReferralCode(code: string) {
  try {
    localStorage.setItem('loca8tor-referral-code', code);
  } catch {}
}

/** Get or create this device's referral account. */
export async function getOrCreateMyReferral() {
  const storedId = getStoredDeviceId();
  const stableId = getStableDeviceId();
  const candidateIds = Array.from(new Set([storedId, stableId, getDeviceId()].filter(Boolean))) as string[];
  const knownReferralCode = getKnownReferralCode();
  const ip = await getUserIp();

  const { data: resolved } = await (supabase as any).rpc('get_device_referral_by_identity', {
    _device_id: candidateIds[0] || null,
    _stable_device_id: stableId,
    _known_referral_code: knownReferralCode,
    _ip_address: ip,
  });

  if (resolved) {
    if (resolved.referral_code) setKnownReferralCode(resolved.referral_code);
    try {
      localStorage.setItem('loca8tor-device-id', resolved.device_id);
    } catch {}
    return resolved;
  }

  if (candidateIds.length > 0) {
    const { data: existingRows } = await supabase
      .from('device_referrals')
      .select('*')
      .in('device_id', candidateIds)
      .order('total_earned', { ascending: false })
      .order('balance', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1);

    const existing = existingRows?.[0];
    if (existing) {
      try {
        localStorage.setItem('loca8tor-device-id', existing.device_id);
      } catch {}
      if (existing.referral_code) setKnownReferralCode(existing.referral_code);
      return existing;
    }
  }

  const deviceId = candidateIds[0] || getDeviceId();

  let code = genCode();
  // Retry on collision — uses SECURITY DEFINER RPC since direct INSERT is locked down by RLS.
  for (let i = 0; i < 3; i++) {
    const { data, error } = await (supabase as any).rpc('create_device_referral', {
      _device_id: deviceId,
      _stable_device_id: stableId,
      _known_referral_code: knownReferralCode,
      _referral_code: code,
      _ip_address: ip,
    });
    if (!error && data) {
      if (data.referral_code) setKnownReferralCode(data.referral_code);
      return data;
    }
    code = genCode();
  }
  throw new Error('Failed to create referral account');
}

/** Detailed referral history for the current device (uses SECURITY DEFINER RPC). */
export async function getReferralHistory(referralCode: string) {
  const { data, error } = await supabase.rpc('get_referral_history', {
    _referral_code: referralCode,
  });
  if (error) return [];
  return data || [];
}

/** Capture a ?ref=CODE query param into localStorage so it can be credited later. */
export function capturePendingReferral() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return;
    if (localStorage.getItem(CLAIMED_KEY)) return; // already credited from any code
    if (localStorage.getItem(PENDING_REF_KEY)) return; // first ref wins
    localStorage.setItem(PENDING_REF_KEY, ref.trim().toUpperCase());
  } catch {}
}

/** Attempt to credit the referrer if a pending code exists and this device hasn't been claimed. */
export async function tryClaimReferral() {
  const code = localStorage.getItem(PENDING_REF_KEY);

  // Always try the signed-in path: credits the referrer (rider/business ₦500 or
  // individual ₦100) when the referred user generates a postcode. Works even if
  // no ?ref= code is in localStorage, because the referral was recorded at signup.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    if (code) {
      try {
        await (supabase as any).rpc('record_referral_signup', {
          _referrer_code: code,
          _referred_user_id: user.id,
          _referred_email: user.email ?? null,
        });
      } catch {}
    }
    let data: any = null;
    try {
      const result = await (supabase as any).rpc('credit_referral_on_postcode');
      data = result.data;
    } catch {}
    if (data?.credited > 0) {
      localStorage.setItem(CLAIMED_KEY, '1');
      localStorage.removeItem(PENDING_REF_KEY);
      return data;
    }
  }

  // Legacy device-based claim (anonymous visitors with ?ref= code)
  if (localStorage.getItem(CLAIMED_KEY)) return;
  if (!code) return;
  if (!user) return; // device claim requires auth in current flow

  const deviceId = getDeviceId();
  const ip = await getUserIp();
  const { data, error } = await supabase.rpc('claim_device_referral', {
    _referrer_code: code,
    _referred_device_id: deviceId,
    _referred_ip: ip,
  });
  if (error) return;
  if ((data as any)?.success) {
    localStorage.setItem(CLAIMED_KEY, '1');
    localStorage.removeItem(PENDING_REF_KEY);
  }
  return data;
}

export async function debitBalance(amount: number) {
  const deviceId = getDeviceId();
  const { data, error } = await supabase.rpc('debit_referral_balance', {
    _device_id: deviceId,
    _amount: amount,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string; new_balance?: number; balance?: number };
}