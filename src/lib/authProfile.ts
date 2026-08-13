import { supabase } from '@/integrations/supabase/client';

type AccountType = 'individual' | 'business' | 'rider';

// `riders.account_type` accepts 'individual' | 'business' | 'rider'.
// Rider / driver accounts MUST stay 'rider' — routing, the nav link and the
// rider dashboard all key off it. Anything unrecognised falls back to
// 'individual'.
function cleanAccountType(value: unknown): AccountType {
  if (value === 'business') return 'business';
  if (value === 'rider') return 'rider';
  return 'individual';
}

function makeCode(prefix: 'BIZ' | 'REF') {
  return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export function getSignupRedirectUrl() {
  return `${window.location.origin}/login?verified=1`;
}

export async function ensureRiderProfileFromMetadata(user: any) {
  if (!user?.id) return null;

  const { data: existing } = await supabase
    .from('riders')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const meta = user.user_metadata || {};
  const accountType = cleanAccountType(meta.account_type);
  const businessName = String(meta.business_name || '').trim();
  const referrerCode = String(meta.referrer_code || '').trim().toUpperCase();
  const pendingBusinessCode = String(meta.pending_business_code || '').trim().toUpperCase();

  async function maybeQueueJoinRequest() {
    // Riders who signed up with a business code should auto-send a join
    // request as soon as their profile row exists.
    if (!pendingBusinessCode || accountType === 'business') return;
    try {
      await (supabase as any).rpc('request_join_business', { p_code: pendingBusinessCode });
    } catch {
      // best-effort — the rider can re-send from the dashboard
    }
  }

  if (existing) {
    if (existing.account_type === 'individual' && accountType === 'business' && businessName) {
      const { data } = await supabase
        .from('riders')
        .update({
          account_type: 'business',
          business_name: businessName,
          business_code: existing.business_code || meta.business_code || makeCode('BIZ'),
          business_size: existing.business_size || 'standard',
          subscription_status: existing.subscription_status || 'none',
        } as any)
        .eq('id', existing.id)
        .select('*')
        .maybeSingle();
      if (referrerCode) {
        await (supabase as any).rpc('record_referral_signup', {
          _referrer_code: referrerCode,
          _referred_user_id: user.id,
          _referred_email: user.email || null,
        }).catch(() => {});
      }
      return data || existing;
    }
    await maybeQueueJoinRequest();
    return existing;
  }

  const base = {
    user_id: user.id,
    full_name: String(meta.full_name || user.email?.split('@')[0] || 'User').trim(),
    phone: String(meta.phone || `user-${user.id.slice(0, 8)}`).trim(),
    location: String(meta.location || '').trim(),
    account_type: accountType,
    business_name: accountType === 'business' ? businessName || null : null,
    business_code: accountType === 'business' ? String(meta.business_code || makeCode('BIZ')).toUpperCase() : null,
    business_size: accountType === 'business' ? 'standard' : null,
    subscription_status: 'none',
    referral_code: String(meta.referral_code || makeCode('REF')).toUpperCase(),
    signup_ip: meta.signup_ip || null,
    worker_type: meta.worker_type || null,
    vehicle_type: meta.vehicle_type || null,
    rider_mode: meta.rider_mode || null,
  };

  for (let i = 0; i < 3; i += 1) {
    const payload = {
      ...base,
      business_code: accountType === 'business' && i > 0 ? makeCode('BIZ') : base.business_code,
      referral_code: i > 0 ? makeCode('REF') : base.referral_code,
    };
    const { data, error } = await supabase.from('riders').insert(payload as any).select('*').maybeSingle();
    if (!error) {
      if (referrerCode) {
        await (supabase as any).rpc('record_referral_signup', {
          _referrer_code: referrerCode,
          _referred_user_id: user.id,
          _referred_email: user.email || null,
        }).catch(() => {});
      }
      await maybeQueueJoinRequest();
      return data;
    }
    if (!/duplicate|unique/i.test(error.message || '')) break;
  }

  return null;
}