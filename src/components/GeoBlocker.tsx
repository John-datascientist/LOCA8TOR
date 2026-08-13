import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Globe, ShieldX } from 'lucide-react';

interface GeoBlockerProps {
  children: React.ReactNode;
}

const CACHE_KEY = 'loca8tor:geo_status';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type CachedGeo = { status: 'allowed' | 'blocked'; countryName: string; ts: number };

function readCache(): CachedGeo | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedGeo;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(v: CachedGeo) {
  try {
    const s = JSON.stringify(v);
    sessionStorage.setItem(CACHE_KEY, s);
    localStorage.setItem(CACHE_KEY, s);
  } catch {}
}

export default function GeoBlocker({ children }: GeoBlockerProps) {
  // Optimistic render: if we've previously verified this visitor, show the app
  // immediately and re-verify in the background. This eliminates the
  // "Verifying your location..." flash on every page load.
  const cached = typeof window !== 'undefined' ? readCache() : null;
  const [status, setStatus] = useState<'loading' | 'allowed' | 'blocked'>(
    cached ? cached.status : 'loading'
  );
  const [countryName, setCountryName] = useState(cached?.countryName || '');

  useEffect(() => {
    // Allow search engine bots to bypass geo-blocking for SEO/indexing
    const ua = navigator.userAgent.toLowerCase();
    const isBot = /googlebot|bingbot|yandexbot|duckduckbot|slurp|baiduspider|facebookexternalhit|twitterbot|linkedinbot|embedly|showyoubot|outbrain|pinterest|applebot|semrushbot|ahrefs|mj12bot|dotbot|petalbot|bytespider/i.test(ua);
    if (isBot) {
      setStatus('allowed');
      return;
    }
    checkCountry();
  }, []);

  const checkCountry = async () => {
    try {
      // Primary detection: our own edge function reads the Cloudflare
      // `cf-ipcountry` header — single round-trip, no third-party rate limits.
      let countryCode = '';
      let detectedName = '';
      try {
        const { data } = await supabase.functions.invoke('get-ip');
        if (data?.country) {
          countryCode = String(data.country).toUpperCase();
          detectedName = countryCode;
        }
      } catch {}

      // Fallback to ipapi.co only if the edge function failed.
      if (!countryCode) {
        try {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          countryCode = (data.country_code || '').toUpperCase();
          detectedName = data.country_name || countryCode;
        } catch {
          setStatus('allowed');
          writeCache({ status: 'allowed', countryName: '', ts: Date.now() });
          return;
        }
      }
      if (detectedName) setCountryName(detectedName);

      if (!countryCode) {
        setStatus('allowed');
        writeCache({ status: 'allowed', countryName: '', ts: Date.now() });
        return;
      }

      const { data: allowed } = await supabase.from('allowed_countries').select('country_code');
      if (!allowed || allowed.length === 0) {
        setStatus('allowed');
        writeCache({ status: 'allowed', countryName: detectedName, ts: Date.now() });
        return;
      }

      const codes = allowed.map(a => a.country_code.toUpperCase());
      const ok = codes.includes(countryCode) ||
        (countryCode === 'UK' && codes.includes('GB')) ||
        (countryCode === 'GB' && codes.includes('UK'));
      const next = ok ? 'allowed' : 'blocked';
      setStatus(next);
      writeCache({ status: next, countryName: detectedName, ts: Date.now() });
    } catch {
      setStatus('allowed');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Globe className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying your location...</p>
        </div>
      </div>
    );
  }

  if (status === 'blocked') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card rounded-2xl ring-1 ring-border p-8 max-w-md text-center space-y-4">
          <ShieldX className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="font-heading text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            Loca8tor is currently available only in <strong className="text-foreground">Nigeria, United Kingdom, Canada, and the United States</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Your detected location: <span className="text-foreground font-medium">{countryName}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            We're expanding to more countries soon. Stay tuned!
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
