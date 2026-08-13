import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Copy, Check, Share2, Navigation, Loader2, Globe, Bike, Clock, RefreshCw } from 'lucide-react';
import { searchPostcodes, searchRidersByPostcode, type RiderLocationResult } from '@/lib/postcodeDatabase';
import type { PostcodeResult } from '@/lib/postcodeGenerator';

// Detect if query looks like a UK postcode pattern
function isUKPostcodePattern(q: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d?[A-Z]{0,2}$/i.test(q.trim());
}

// Search Nominatim for a real postcode (UK, etc.)
async function searchUKPostcode(query: string): Promise<PostcodeResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=gb&addressdetails=1&limit=5`
    );
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((item: any) => item.address?.postcode)
      .map((item: any) => {
        const addr = item.address || {};
        const state = addr.state || addr.county || '';
        const country = addr.country || 'United Kingdom';
        const road = addr.road || '';
        const area = addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || '';
        const parts = [road, area, state].filter(Boolean);
        return {
          postcode: addr.postcode,
          state,
          areaCode: addr.postcode.split(' ')[0] || addr.postcode.slice(0, 2),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          address: parts.join(', ') || item.display_name?.split(',').slice(0, 3).join(',') || '',
          country,
          isGenerated: false,
        } as PostcodeResult;
      });
  } catch {
    return [];
  }
}

export default function PostcodeSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PostcodeResult[]>([]);
  const [riderLocations, setRiderLocations] = useState<RiderLocationResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const lastQueryRef = useRef('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh rider locations every 15 seconds
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh && searched && lastQueryRef.current) {
      intervalRef.current = setInterval(async () => {
        const riders = await searchRidersByPostcode(lastQueryRef.current);
        setRiderLocations(riders);
      }, 15000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, searched]);

  // Auto-format postcode: uppercase + ensure space
  const formatPostcodeInput = (val: string) => {
    return val.toUpperCase();
  };

  const handleSearch = async () => {
    setLoading(true);
    lastQueryRef.current = query;
    const [data, riders] = await Promise.all([
      searchPostcodes(query),
      searchRidersByPostcode(query),
    ]);
    setRiderLocations(riders);
    
    // If query looks like a UK postcode and no DB results, try Nominatim
    if (data.length === 0 && isUKPostcodePattern(query)) {
      const ukResults = await searchUKPostcode(query);
      setResults(ukResults);
    } else if (isUKPostcodePattern(query)) {
      // Also augment with UK results
      const ukResults = await searchUKPostcode(query);
      const seen = new Set(data.map(r => r.postcode));
      const merged = [...data];
      for (const r of ukResults) {
        if (!seen.has(r.postcode)) { seen.add(r.postcode); merged.push(r); }
      }
      setResults(merged);
    } else {
      setResults(data);
    }
    setSearched(true);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const copyPostcode = async (postcode: string, idx: number) => {
    await navigator.clipboard.writeText(postcode);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const sharePostcode = async (item: PostcodeResult) => {
    const text = `📍 Postcode: ${item.postcode}\n📌 ${item.address || item.state}\n🗺️ https://www.google.com/maps?q=${item.lat},${item.lng}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Postcode: ${item.postcode}`, text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-card rounded-lg ring-1 ring-border shadow-sm focus-within:ring-2 focus-within:ring-primary transition-shadow">
          <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(formatPostcodeInput(e.target.value))}
            onKeyDown={handleKeyDown}
            placeholder="Search by postcode, address, state…"
            className="w-full bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-primary text-primary-foreground font-heading font-semibold text-sm px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </div>

      {searched && !loading && results.length === 0 && riderLocations.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No postcodes found. Generate some postcodes first!</p>
      )}

      {/* Auto-refresh toggle */}
      {searched && riderLocations.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin text-primary' : ''}`} style={autoRefresh ? { animationDuration: '3s' } : {}} />
            {autoRefresh ? 'Live · updates every 15s' : 'Auto-refresh paused'}
          </p>
          <button
            onClick={() => setAutoRefresh(prev => !prev)}
            className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${autoRefresh ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </button>
        </div>
      )}

      {/* Live Rider Locations */}
      {riderLocations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-heading font-bold text-foreground flex items-center gap-2">
            <Bike className="w-4 h-4 text-primary" /> Live Rider Locations
          </p>
          {riderLocations.map((rider, i) => {
            const lastSeen = rider.last_seen ? new Date(rider.last_seen) : null;
            const minutesAgo = lastSeen ? Math.round((Date.now() - lastSeen.getTime()) / 60000) : null;
            const isOnline = minutesAgo !== null && minutesAgo < 15;
            return (
              <div key={i} className="bg-card rounded-lg ring-1 ring-border p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOnline ? 'bg-green-500/10' : 'bg-muted'}`}>
                    <Bike className={`w-4 h-4 ${isOnline ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-heading font-bold text-sm text-foreground">{rider.rider_name}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isOnline ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-xs text-primary font-mono">📍 {rider.last_postcode}</p>
                    {minutesAgo !== null && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {minutesAgo < 1 ? 'Just now' : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.round(minutesAgo / 60)}h ago`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <a
                    href={`https://www.google.com/maps?q=${rider.last_lat},${rider.last_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1.5 rounded hover:bg-secondary"
                  >
                    <Navigation className="w-3 h-3" /> View Live Location
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((item, i) => (
            <div key={i} className="bg-card rounded-lg ring-1 ring-border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-foreground">{item.postcode}</p>
                    {item.country && item.country !== 'Nigeria' ? (
                      <>
                        {item.address && <p className="text-xs text-muted-foreground truncate">{item.address}</p>}
                        <p className="text-xs text-muted-foreground">
                          {item.state} · {item.country}
                        </p>
                      </>
                    ) : (
                      <>
                        {item.lga && item.country === 'Nigeria' && <p className="text-xs text-muted-foreground">{item.lga} LGA</p>}
                        <p className="text-xs text-muted-foreground">{item.state} State</p>
                      </>
                    )}
                    <p className="text-[10px] text-muted-foreground font-mono tabular-nums mt-0.5">
                      {item.lat.toFixed(5)}°N, {item.lng.toFixed(5)}°E
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <button
                  onClick={() => copyPostcode(item.postcode, i)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-secondary"
                >
                  {copiedIdx === i ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                  {copiedIdx === i ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => sharePostcode(item)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-secondary"
                >
                  <Share2 className="w-3 h-3" /> Share
                </button>
                <a
                  href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1.5 rounded hover:bg-secondary"
                >
                  <Navigation className="w-3 h-3" /> View on Google Maps
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
