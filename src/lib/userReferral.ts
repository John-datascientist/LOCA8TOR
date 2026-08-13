import { supabase } from '@/integrations/supabase/client';
import { getDeviceId, getStableDeviceId, getStoredDeviceId } from './deviceId';

export interface UserReferralBalance {
  id: string;
  user_id: string;
  referral_code: string;
  balance: number;
  total_earned: number;
  total_referrals: number;
  migrated_from_device_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch the signed-in user's referral balance row. */
export async function getMyUserReferralBalance(): Promise<UserReferralBalance | null> {
  const { data, error } = await (supabase as any).rpc('get_my_referral_balance');
  if (error) {
    console.warn('get_my_referral_balance failed', error);
    return null;
  }
  return (data as UserReferralBalance) ?? null;
}

/** Move any device-based referral balance into the freshly created user account. */
export async function migrateDeviceBalanceToUser(userId: string): Promise<UserReferralBalance | null> {
  const deviceId = getDeviceId();
  const stableId = getStableDeviceId();
  let knownReferralCode: string | null = null;
  try {
    knownReferralCode = localStorage.getItem('loca8tor-referral-code');
  } catch {}
  const { data, error } = await (supabase as any).rpc('migrate_device_to_user_referral', {
    _user_id: userId,
    _device_id: deviceId,
    _stable_device_id: stableId,
    _known_referral_code: knownReferralCode,
  });
  if (error) {
    console.warn('migrate_device_to_user_referral failed', error);
    return null;
  }
  return (data as UserReferralBalance) ?? null;
}

/** Atomic withdrawal debit for the signed-in user. */
export async function debitUserBalance(amount: number) {
  const { data, error } = await (supabase as any).rpc('debit_user_referral_balance', {
    _amount: amount,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string; new_balance?: number };
}

/** Best-effort device-id from any stored signal — used for legacy fallbacks. */
export function getAnyDeviceId(): string {
  return getStoredDeviceId() || getStableDeviceId() || getDeviceId();
}