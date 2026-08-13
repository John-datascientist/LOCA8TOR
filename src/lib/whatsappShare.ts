import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from './deviceId';
import { getUserIp } from './ipAddress';

export interface ShareGateStatus {
  authenticated: boolean;
  is_individual?: boolean;
  total_shares?: number;
  required?: number;
  remaining?: number;
  gate_passed?: boolean;
  applies?: boolean;
}

export interface RecordShareResult {
  success: boolean;
  error?: string;
  inserted?: boolean;
  duplicate?: boolean;
  total_shares?: number;
  required?: number;
  remaining?: number;
  gate_passed?: boolean;
}

/** Normalize a phone for display & wa.me link (digits only, no +). */
export function digitsOnly(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/** Normalize to E.164 client-side for preview. Returns null if invalid. */
export function normalizeWhatsAppPhone(phone: string): string | null {
  const clean = phone.replace(/[^0-9+]/g, '');
  if (/^0[7-9][0-9]{9}$/.test(clean)) return '+234' + clean.slice(1);
  if (/^234[0-9]{10}$/.test(clean)) return '+' + clean;
  if (/^\+?[1-9][0-9]{9,14}$/.test(clean)) return clean.startsWith('+') ? clean : '+' + clean;
  return null;
}

export function maskPhone(e164: string): string {
  if (!e164) return '';
  if (e164.length < 6) return e164;
  return e164.slice(0, 4) + ' *** *** ' + e164.slice(-3);
}

export async function getShareGateStatus(): Promise<ShareGateStatus> {
  const { data, error } = await (supabase as any).rpc('get_share_gate_status');
  if (error || !data) return { authenticated: false };
  return data as ShareGateStatus;
}

export async function recordWhatsAppShare(
  recipientPhone: string,
  message: string,
): Promise<RecordShareResult> {
  const ip = await getUserIp().catch(() => null);
  const deviceId = (() => {
    try { return getDeviceId(); } catch { return null; }
  })();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null;
  const { data, error } = await (supabase as any).rpc('record_whatsapp_share', {
    _recipient_phone: recipientPhone,
    _message: message,
    _ip_address: ip,
    _device_id: deviceId,
    _user_agent: ua,
  });
  if (error) return { success: false, error: error.message };
  return data as RecordShareResult;
}

export async function listMyShares() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('whatsapp_shares' as any)
    .select('id, recipient_phone, created_at')
    .order('created_at', { ascending: false });
  return (data as any[]) || [];
}

/** Try to credit any pending individual referrals once the gate is passed. */
export async function sweepPendingReferralCredits() {
  const { data, error } = await (supabase as any).rpc('credit_pending_referrals_for_referrer');
  if (error) return null;
  return data;
}

export function buildShareMessage(referralCode?: string | null): string {
  const base = 'https://loca8tor.com';
  const url = referralCode ? `${base}/?ref=${encodeURIComponent(referralCode)}` : base;
  return `Hey! I'm using Loca8tor to generate location postcodes anywhere in Nigeria. Try it free: ${url}`;
}

export function buildWhatsAppLink(e164: string, message: string): string {
  const digits = digitsOnly(e164);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}