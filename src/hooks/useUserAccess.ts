import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const COUNTRY_CACHE_KEY = 'loca8tor:country_code';

const isPreviewHost = () => {
  if (typeof window === 'undefined') return false;
  if (window.location.hostname === 'localhost') return true;
  // Vercel bakes VERCEL_ENV in at build time (see vite.config.ts). A bare
  // hostname.endsWith('.vercel.app') check would also match production when
  // no custom domain is set (production's own URL is *.vercel.app too), so
  // use the actual build environment instead of guessing from the hostname.
  return typeof __VERCEL_ENV__ !== 'undefined' && __VERCEL_ENV__ === 'preview';
};

async function detectCountry(): Promise<string> {
  let code = '';
  // Primary: our own edge function reads the Cloudflare `cf-ipcountry` header.
  // This is the most reliable signal — no rate limits, no third-party blocks.
  try {
    const { data } = await supabase.functions.invoke('get-ip');
    if (data?.country) code = String(data.country).toUpperCase();
  } catch {}

  // Fallback to cached value from a previous successful detection.
  if (!code) {
    const cached = sessionStorage.getItem(COUNTRY_CACHE_KEY);
    if (cached) return cached;
  }

  // Last-resort fallbacks: external IP geolocation services.
  if (!code) {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    code = (data?.country_code || '').toUpperCase();
  } catch {
    try {
      const res = await fetch('https://ip2c.org/s');
      const text = await res.text();
      const parts = text.split(';');
      if (parts.length >= 2) code = parts[1].toUpperCase();
    } catch {
      code = '';
    }
  }
  }
  if (code) sessionStorage.setItem(COUNTRY_CACHE_KEY, code);
  return code;
}

export interface UserAccess {
  ready: boolean;
  countryCode: string;
  isNigeria: boolean;
  isSuperAdmin: boolean;
  isPreview: boolean;
  /**
   * True when Nigeria-only features should be shown.
   * Super admins and preview/sandbox sessions always see everything.
   */
  showNgFeatures: boolean;
}

/**
 * Lightweight access hook for visibility gating across the app.
 * Combines IP-based country detection with the super_admins table.
 * Note: GeoBlocker still restricts the entire app to allowed countries —
 * this hook only narrows *which* features are shown to allowed visitors.
 */
export function useUserAccess(): UserAccess {
  const [countryCode, setCountryCode] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const isPreview = isPreviewHost();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // getSession() reads from local storage (no network) so it never hangs
      // on token refresh. detectCountry is allowed up to 4s — if it stalls we
      // still mark the hook ready so the UI doesn't get stuck on a spinner.
      const sessionPromise = supabase.auth.getSession();
      const countryPromise = Promise.race<string>([
        detectCountry(),
        new Promise<string>((resolve) => setTimeout(() => resolve(''), 4000)),
      ]);
      const [code, { data: { session } }] = await Promise.all([countryPromise, sessionPromise]);
      if (cancelled) return;
      setCountryCode(code);

      const email = session?.user?.email;
      if (email) {
        supabase.from('super_admins').select('email').eq('email', email).maybeSingle()
          .then(({ data }) => { if (!cancelled) setIsSuperAdmin(!!data); });
      } else {
        setIsSuperAdmin(false);
      }
      if (!cancelled) setReady(true);
    };

    load();
    // Hard safety net — never let `ready` stay false longer than 6s.
    const readyTimeout = setTimeout(() => { if (!cancelled) setReady(true); }, 6000);

    // Do not await inside onAuthStateChange (causes deadlocks).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const email = session?.user?.email;
      if (!email) { setIsSuperAdmin(false); return; }
      supabase.from('super_admins').select('email').eq('email', email).maybeSingle()
        .then(({ data }) => { if (!cancelled) setIsSuperAdmin(!!data); });
    });

    return () => { cancelled = true; clearTimeout(readyTimeout); subscription.unsubscribe(); };
  }, []);

  const isNigeria = countryCode === 'NG';
  // Business, Riders and Track Delivery are now open to every allowed country
  // (GeoBlocker still restricts the app to NG, UK, CA, US).
  const showNgFeatures = true;

  return { ready, countryCode, isNigeria, isSuperAdmin, isPreview, showNgFeatures };
}