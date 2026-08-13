import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { X, Search, Save, Trash2, MapPin, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generatePostcodeWithAddress, reverseGeocode, type PostcodeResult } from '@/lib/postcodeGenerator';
import { addPostcodeToDB } from '@/lib/postcodeDatabase';

const MapView = lazy(() => import('@/components/MapView'));

interface LandmarkRow {
  id: string;
  name: string;
  address: string;
  postcode: string;
  state: string | null;
  country: string | null;
  lga: string | null;
  lat: number;
  lng: number;
  created_by_email: string | null;
  created_at: string;
}

interface Props {
  onClose: () => void;
  adminEmail: string;
  adminPin: string;
}

export default function AdminLandmarksPanel({ onClose, adminEmail, adminPin }: Props) {
  const [items, setItems] = useState<LandmarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<PostcodeResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Address search (Nominatim, biased to NG/UK/US/CA, POI-friendly)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string; type?: string; class?: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]); setSearchOpen(false); setSearchErr(null);
      return;
    }
    setSearching(true); setSearchErr(null);
    try {
      // 1st pass: bias to supported countries + POI-friendly params
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=10&countrycodes=ng,gb,us,ca&q=${encodeURIComponent(q)}`;
      let res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      let data = await res.json();
      // Fallback: worldwide search if nothing matched in bias set
      if (!Array.isArray(data) || data.length === 0) {
        const url2 = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=10&q=${encodeURIComponent(q)}`;
        res = await fetch(url2, { headers: { 'Accept-Language': 'en' } });
        data = await res.json();
      }
      const list = Array.isArray(data) ? data : [];
      setSearchResults(list);
      setSearchOpen(true);
      if (list.length === 0) setSearchErr('No matches found. Try a more specific address or drop a pin on the map after selecting a nearby place.');
    } catch {
      setSearchErr('Search failed. Check your connection and try again.');
      setSearchResults([]); setSearchOpen(true);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchChange = (v: string) => {
    setSearchQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 350);
  };

  const pickSearchResult = (r: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
    setSearchQuery(r.display_name.split(',')[0]);
    setSearchOpen(false);
    if (!address.trim()) setAddress(r.display_name);
    handlePickLocation(lat, lng);
  };

  const load = async () => {
    setLoading(true);
    // Full rows (including created_by_email) are only readable via this
    // super-admin-guarded RPC — public reads on the table exclude that column.
    const { data } = await (supabase as any).rpc('admin_list_landmarks_full');
    setItems((data as any as LandmarkRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePickLocation = async (lat: number, lng: number) => {
    setCenter([lat, lng]);
    setResult(null);
    setGenerating(true);
    setMsg(null);
    try {
      // Prefill address from reverse geocode if empty
      if (!address.trim()) {
        const geo = await reverseGeocode(lat, lng);
        if (geo.address) setAddress(geo.address);
      }
      const r = await generatePostcodeWithAddress(lat, lng);
      setResult(r);
    } catch (e: any) {
      setMsg({ type: 'err', text: 'Failed to generate postcode. Try again.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return setMsg({ type: 'err', text: 'Name is required' });
    if (!address.trim()) return setMsg({ type: 'err', text: 'Address is required' });
    if (!result || !center) return setMsg({ type: 'err', text: 'Pick a location and generate a postcode first' });

    setSaving(true);
    setMsg(null);
    const useStaff = adminEmail && adminPin.length === 7;
    const { error } = await (supabase as any).rpc('admin_upsert_landmark', {
      _admin_email: useStaff ? adminEmail.toLowerCase() : null,
      _admin_pin: useStaff ? adminPin : null,
      _id: null,
      _name: name.trim(),
      _address: address.trim(),
      _postcode: result.postcode,
      _state: result.state || null,
      _country: result.country || null,
      _lga: result.lga || null,
      _lat: center[0],
      _lng: center[1],
    });
    setSaving(false);
    if (error) return setMsg({ type: 'err', text: error.message || 'Failed to save landmark' });
    // Also log to the shared postcodes table so it appears in Generated stats and normal search.
    try {
      await addPostcodeToDB({
        postcode: result.postcode,
        state: result.state || result.country || 'Unknown',
        areaCode: (result.postcode || '').substring(0, 2),
        address: `${name.trim()} — ${address.trim()}`,
        country: result.country,
        lga: result.lga,
        lat: center[0],
        lng: center[1],
      } as any);
    } catch (e) {
      console.warn('Failed to log landmark postcode to postcodes table', e);
    }
    setMsg({ type: 'ok', text: `Saved "${name}" — ${result.postcode}` });
    setName(''); setAddress(''); setCenter(null); setResult(null);
    load();
  };

  const handleDelete = async (id: string, nameLabel: string) => {
    if (!confirm(`Delete "${nameLabel}"?`)) return;
    const useStaff = adminEmail && adminPin.length === 7;
    const { error } = await (supabase as any).rpc('admin_delete_landmark', {
      _id: id,
      _admin_email: useStaff ? adminEmail.toLowerCase() : null,
      _admin_pin: useStaff ? adminPin : null,
    });
    if (error) return alert(error.message || 'Failed to delete');
    load();
  };

  const filtered = items.filter(i => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return i.name.toLowerCase().includes(q)
      || (i.address || '').toLowerCase().includes(q)
      || (i.postcode || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-bold flex-1">Admin Landmarks</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Search an address, generate a postcode, then save it with a company/place name. Saved landmarks appear in the normal search when users type the name.
        </p>

        {/* Creator */}
        <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
          <p className="text-sm font-heading font-semibold">Add a new landmark</p>

          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Search address / place</label>
            <div className="mt-1 relative">
              <div className="flex items-center bg-background rounded-md ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
                <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                  placeholder="e.g. Ikeja City Mall, Shoprite Lekki, 10 Downing Street"
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                />
                {searching && <Loader2 className="w-4 h-4 mr-3 animate-spin text-muted-foreground" />}
              </div>
              {searchOpen && (
                <div className="absolute z-[60] top-full left-0 right-0 mt-1.5 bg-card rounded-lg ring-1 ring-border shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                  {searchErr && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">{searchErr}</p>
                  )}
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => pickSearchResult(r)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary border-b border-border last:border-0"
                    >
                      <p className="font-medium truncate">{r.display_name.split(',')[0]}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{r.display_name.split(',').slice(1).join(',').trim()}</p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Biased to Nigeria, UK, US &amp; Canada. If nothing matches, pick the closest place then tap the map to fine-tune.</p>
            </div>
          </div>

          {center && (
            <div className="h-64 rounded-lg overflow-hidden">
              <Suspense fallback={<div className="h-full bg-secondary animate-pulse" />}>
                <MapView
                  center={center}
                  postcode={result?.postcode}
                  state={result?.state}
                  onMapClick={handlePickLocation}
                />
              </Suspense>
              <p className="text-[10px] text-muted-foreground mt-1">Tip: tap the map to fine-tune the exact spot.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Name / company</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shoprite Ikeja City Mall"
                className="mt-1 w-full bg-background rounded-md ring-1 ring-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full street address"
                className="mt-1 w-full bg-background rounded-md ring-1 ring-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] bg-primary/10 rounded-md px-3 py-2 ring-1 ring-primary/30">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Generated postcode</p>
              <p className="font-heading font-bold text-primary text-sm">
                {generating ? <Loader2 className="w-4 h-4 animate-spin inline" /> : (result?.postcode || '—')}
              </p>
              {result && (
                <p className="text-[10px] text-muted-foreground">
                  {result.state}{result.lga ? ` · ${result.lga}` : ''}{center ? ` · ${center[0].toFixed(5)}, ${center[1].toFixed(5)}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !result || !name.trim() || !address.trim()}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-heading font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save landmark
            </button>
          </div>

          {msg && (
            <p className={`text-xs ${msg.type === 'ok' ? 'text-primary' : 'text-destructive'}`}>{msg.text}</p>
          )}
        </div>

        {/* Existing */}
        <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved landmarks by name, address or postcode"
              className="flex-1 bg-background rounded-md ring-1 ring-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">{filtered.length}/{items.length}</span>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">No landmarks saved yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((l) => (
                <li key={l.id} className="py-2 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-sm truncate">{l.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{l.address}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground">{l.postcode}</span>
                      {l.state ? ` · ${l.state}` : ''}{l.lga ? ` · ${l.lga}` : ''}
                      {l.created_by_email ? ` · by ${l.created_by_email}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(l.id, l.name)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
