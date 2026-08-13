import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '@/components/SEO';
import { Search, Loader2, MapPin, Copy, Share2, Navigation, ArrowLeft } from 'lucide-react';
import { searchPostcodes } from '@/lib/postcodeDatabase';
import { generatePostcodeWithAddress, reverseGeocode, normalizeNigerianPostcodeDistrict, type PostcodeResult } from '@/lib/postcodeGenerator';
import MapView from '@/components/MapView';
import { savePostcodeHistory } from '@/lib/postcodeHistory';
import { supabase } from '@/integrations/supabase/client';

interface LandmarkRow {
  name: string;
  address: string | null;
  postcode: string;
  state: string | null;
  lat: number;
  lng: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PostcodeResult | null>(null);
  const [showBrowse, setShowBrowse] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchParams] = useSearchParams();
  // Riders see "Open in App Live Map"; everyone else sees Google Maps.
  const [isRider, setIsRider] = useState(false);
  const [isNG, setIsNG] = useState(false);
  const [landmarks, setLandmarks] = useState<LandmarkRow[]>([]);
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: rider } = await supabase.from('riders').select('account_type, worker_type').eq('user_id', u.user.id).maybeSingle();
      setIsRider(
        (rider as any)?.account_type === 'rider' ||
        ['rider', 'driver'].includes(String((rider as any)?.worker_type || ''))
      );
    })();
  }, []);

  // Detect Nigerian IP and preload landmarks for the "Popular Locations" section.
  useEffect(() => {
    (async () => {
      try {
        let allow = false;
        const { data: u } = await supabase.auth.getUser();
        const email = u.user?.email;
        if (email) {
          const { data: sa } = await supabase.from('super_admins').select('email').eq('email', email).maybeSingle();
          if (sa) allow = true;
        }
        if (!allow) {
          const { data } = await supabase.functions.invoke('get-ip');
          const country = String((data as any)?.country || '').toUpperCase();
          if (country === 'NG') allow = true;
        }
        if (!allow) return;
        setIsNG(true);
        const { data: rows } = await supabase
          .from('admin_landmarks' as any)
          .select('name,address,postcode,state,lat,lng')
          .eq('country', 'Nigeria')
          .order('state', { ascending: true })
          .order('name', { ascending: true });
        if (rows) {
          setLandmarks((rows as any[]).map((row) => ({
            ...row,
            postcode: normalizeNigerianPostcodeDistrict(row.postcode || ''),
          })) as any);
        }
      } catch {}
    })();
  }, []);

  const landmarksByState = landmarks.reduce<Record<string, LandmarkRow[]>>((acc, l) => {
    const key = l.state || 'Other';
    (acc[key] ||= []).push(l);
    return acc;
  }, {});
  const sortedStateKeys = Object.keys(landmarksByState).sort();

  const runSearchFor = async (postcode: string) => {
    const raw = postcode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const formatted = raw.length > 3 ? raw.slice(0, -3) + ' ' + raw.slice(-3) : raw;
    setQuery(formatted);
    setShowBrowse(false);
    setErrorMsg('');
    setResult(null);
    setLoading(true);
    try {
      const results = await searchPostcodes(formatted);
      if (results.length > 0) setResultAndRemember(results[0]);
      else setErrorMsg('No location found for that postcode.');
    } catch {
      setErrorMsg('Search failed. Please try again.');
    }
    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Wrapper that mirrors `setResult` while syncing successful lookups to the
  // signed-in user's cross-device history (no-op for guests).
  const setResultAndRemember = (pc: PostcodeResult | null) => {
    setResult(pc);
    if (pc) void savePostcodeHistory(pc, 'search');
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    // Only allow exactly 6 alphanumeric characters (spaces stripped).
    const raw = q.replace(/\s+/g, '');
    if (!/^[A-Z0-9]{5,8}$/i.test(raw)) {
      setErrorMsg('Enter a valid postcode (5–8 characters, e.g. LA12 3BC or FC02 2LY).');
      setResult(null);
      setShowBrowse(false);
      return;
    }
    setLoading(true);
    setShowBrowse(false);
    setErrorMsg('');
    setResult(null);

    try {
      const results = await searchPostcodes(q);
      if (results.length > 0) {
        setResultAndRemember(results[0]);
      } else {
        setErrorMsg('No location found for that postcode. Double-check the 5–8 characters and try again.');
      }
    } catch (e) {
      setErrorMsg('Search failed. Please try again.');
    }
    setLoading(false);
  };

  // Auto-run a search when the page loads with ?q=POSTCODE (shared links).
  useEffect(() => {
    const shared = searchParams.get('q');
    if (!shared) return;
    const raw = shared.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
    if (raw.length < 5) return;
    const formatted = raw.length > 3 ? raw.slice(0, -3) + ' ' + raw.slice(-3) : raw;
    setQuery(formatted);
    setShowBrowse(false);
    setLoading(true);
    setErrorMsg('');
    (async () => {
      try {
        const results = await searchPostcodes(formatted);
        if (results.length > 0) {
          setResultAndRemember(results[0]);
        } else {
          setErrorMsg('No location found for that postcode. Double-check the 5–8 characters and try again.');
        }
      } catch {
        setErrorMsg('Search failed. Please try again.');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.postcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `📍 ${result.postcode} — ${result.address || result.state}\nView on Loca8tor: ${window.location.origin}/search?q=${encodeURIComponent(result.postcode)}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Loca8tor', text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Search Postcodes — Loca8tor" description="Look up any postcode or find the code for a location. Search Nigeria, UK, USA, and Canada postcodes instantly." path="/search" />
      {/* Search hero */}
      <div className="bg-card border-b border-border py-14 px-5 md:px-7">
        <div className="text-center mb-5">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-2">Lookup</div>
          <h1 className="font-heading text-[clamp(26px,4vw,42px)] font-extrabold tracking-[-1px]">Search Any Location Code</h1>
          <p className="text-muted-foreground mt-2 text-sm">Works for Nigeria, UK, USA, and Canada</p>
        </div>

        {/* Search bar */}
        <div className="max-w-[640px] mx-auto flex gap-2">
          <div className="flex-1 flex items-center bg-secondary border border-border rounded-xl focus-within:border-primary transition-colors">
            <Search className="w-4 h-4 text-muted-foreground ml-4 shrink-0" />
            <input
              type="text"
              value={query}
              maxLength={9}
              onChange={e => {
                let val = e.target.value.toUpperCase();
                // Strip non-alphanumeric, cap at 8 chars (covers UK + FCT 7-char),
                // auto-insert a space before the last 3 chars.
                const raw = val.replace(/[^A-Z0-9]/g, '').slice(0, 8);
                val = raw.length > 3 ? raw.slice(0, -3) + ' ' + raw.slice(-3) : raw;
                setQuery(val);
              }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Enter postcode (e.g. LA12 3BC, FC02 2LY)"
              className="flex-1 px-3 py-3.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-7 py-3.5 bg-primary text-primary-foreground font-heading font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-5 md:px-7 py-8">
        {/* Result card */}
        {result && (
          <div className="bg-secondary border border-border rounded-2xl overflow-hidden mb-8 animate-fade-up">
            <div className="p-7 border-b border-border">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold mb-3">
                {result.countryCode === 'NG' ? '🇳🇬' : result.country?.includes('United Kingdom') ? '🇬🇧' : result.country?.includes('United States') ? '🇺🇸' : result.country?.includes('Canada') ? '🇨🇦' : '🌍'}
                {' '}{result.countryCode || 'NG'}
              </div>
              <div className="font-mono text-[clamp(24px,5vw,48px)] font-bold text-primary tracking-[3px]">
                {result.postcode}
              </div>
              <div className="text-muted-foreground mt-2 text-sm">
                {result.state}{result.country === 'Nigeria' ? ', Nigeria' : result.country ? `, ${result.country}` : ''}
              </div>
              {result.address && <div className="text-xs text-muted-foreground mt-1">{result.address}</div>}
              <div className="text-xs font-mono text-muted-foreground mt-1">
                {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {result.isGenerated === false
                  ? <span className="inline-flex items-center px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs font-bold">Real Postcode</span>
                  : <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">Generated</span>
                }
              </div>
            </div>

            {/* Map */}
            <div style={{ height: '280px' }}>
              <MapView center={[result.lat, result.lng]} postcode={result.postcode} state={result.state} />
            </div>

            {/* Actions */}
            <div className="p-4 bg-card flex flex-wrap gap-2">
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:brightness-110 transition-all">
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-4 py-2 bg-secondary border border-border text-xs font-semibold rounded-lg hover:border-primary/40 transition-all">
                📤 Share
              </button>
              {isRider ? (
                <Link
                  to={`/map?lat=${result.lat}&lng=${result.lng}&pc=${encodeURIComponent(result.postcode)}`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-secondary border border-border text-xs font-semibold rounded-lg hover:border-primary/40 transition-all"
                >
                  <Navigation className="w-3 h-3" /> Open in App Live Map
                </Link>
              ) : (
                <a
                  href={`https://www.google.com/maps?q=${result.lat},${result.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-secondary border border-border text-xs font-semibold rounded-lg hover:border-primary/40 transition-all"
                >
                  🗺 Google Maps
                </a>
              )}
              <button
                onClick={() => { setResult(null); setShowBrowse(true); setQuery(''); }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Browse
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && !loading && (
          <div className="text-center py-10">
            <div className="text-4xl opacity-30 mb-3">🔍</div>
            <h3 className="font-heading text-lg font-bold">{errorMsg}</h3>
            <p className="text-muted-foreground text-sm mt-2">Try a different code or location name.</p>
            <button
              onClick={() => { setErrorMsg(''); setShowBrowse(true); }}
              className="mt-4 px-5 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-lg"
            >
              ← Browse States
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-14">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          </div>
        )}

        {/* Browse states */}
        {showBrowse && !loading && !result && !errorMsg && (
          <div>
            {isNG && sortedStateKeys.length > 0 && (
              <div className="mb-10">
                <div className="mb-4">
                  <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-1">Featured</div>
                  <h2 className="font-heading text-xl font-bold">Popular Locations in Nigeria & their Postcodes</h2>
                  <p className="text-xs text-muted-foreground mt-1">Tap any location to look up its postcode instantly.</p>
                </div>
                <div className="space-y-6">
                  {sortedStateKeys.map(stateName => (
                    <div key={stateName}>
                      <h3 className="font-heading text-sm font-bold text-primary mb-2 uppercase tracking-wide">{stateName}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {landmarksByState[stateName].map((l, i) => (
                          <button
                            key={`${l.postcode}-${i}`}
                            onClick={() => runSearchFor(l.postcode)}
                            className="bg-secondary border border-border rounded-lg p-3 text-left hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                          >
                            <div className="font-heading text-sm font-bold text-foreground truncate">{l.name}</div>
                            {l.address && <div className="text-[11px] text-muted-foreground truncate mt-0.5">{l.address}</div>}
                            <div className="font-mono text-xs text-primary font-bold mt-1">{l.postcode}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
