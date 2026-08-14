import { supabase } from '@/integrations/supabase/client';
import {
  readOfflinePostcode,
  writeOfflinePostcode,
  findNearestOffline,
  isOnline,
} from './offlinePostcodeCache';

// ══ NIGERIAN STATES (matching uploaded site) ══
const STATES_NG = [
  {n:'Abia',a:'AB',lat:5.4527,lng:7.5248,lgas:17},{n:'Adamawa',a:'AD',lat:9.3265,lng:12.3984,lgas:21},
  {n:'Akwa Ibom',a:'AK',lat:5.0077,lng:7.8537,lgas:31},{n:'Anambra',a:'AN',lat:6.2209,lng:7.0669,lgas:21},
  {n:'Bauchi',a:'BA',lat:10.3158,lng:9.8442,lgas:20},{n:'Bayelsa',a:'BY',lat:4.7719,lng:6.0699,lgas:8},
  {n:'Benue',a:'BE',lat:7.3369,lng:8.7408,lgas:23},{n:'Borno',a:'BO',lat:11.8333,lng:13.1500,lgas:27},
  {n:'Cross River',a:'CR',lat:5.8702,lng:8.5988,lgas:18},{n:'Delta',a:'DE',lat:5.8904,lng:5.6804,lgas:25},
  {n:'Ebonyi',a:'EB',lat:6.2649,lng:8.0137,lgas:13},{n:'Edo',a:'ED',lat:6.3350,lng:5.6037,lgas:18},
  {n:'Ekiti',a:'EK',lat:7.7190,lng:5.3110,lgas:16},{n:'Enugu',a:'EN',lat:6.4584,lng:7.5464,lgas:17},
  {n:'FCT',a:'FC',lat:9.0765,lng:7.3986,lgas:6},{n:'Gombe',a:'GO',lat:10.2791,lng:11.1670,lgas:11},
  {n:'Imo',a:'IM',lat:5.5720,lng:7.0588,lgas:27},{n:'Jigawa',a:'JI',lat:12.2280,lng:9.5616,lgas:27},
  {n:'Kaduna',a:'KD',lat:10.5222,lng:7.4383,lgas:23},{n:'Kano',a:'KN',lat:12.0022,lng:8.5920,lgas:44},
  {n:'Katsina',a:'KT',lat:12.9908,lng:7.6017,lgas:34},{n:'Kebbi',a:'KB',lat:12.4539,lng:4.1975,lgas:21},
  {n:'Kogi',a:'KO',lat:7.7337,lng:6.6906,lgas:21},{n:'Kwara',a:'KW',lat:8.9669,lng:4.3874,lgas:16},
  {n:'Lagos',a:'LA',lat:6.5244,lng:3.3792,lgas:20},{n:'Nasarawa',a:'NA',lat:8.4966,lng:8.5254,lgas:13},
  {n:'Niger',a:'NI',lat:9.9309,lng:5.5983,lgas:25},{n:'Ogun',a:'OG',lat:7.1601,lng:3.3497,lgas:20},
  {n:'Ondo',a:'ON',lat:7.2508,lng:5.1952,lgas:18},{n:'Osun',a:'OS',lat:7.5629,lng:4.5200,lgas:30},
  {n:'Oyo',a:'OY',lat:7.3775,lng:3.9470,lgas:33},{n:'Plateau',a:'PL',lat:9.2182,lng:9.5179,lgas:17},
  {n:'Rivers',a:'RI',lat:4.8396,lng:6.9114,lgas:23},{n:'Sokoto',a:'SO',lat:13.0545,lng:5.2225,lgas:23},
  {n:'Taraba',a:'TA',lat:7.8699,lng:10.0158,lgas:16},{n:'Yobe',a:'YO',lat:12.2939,lng:11.4390,lgas:17},
  {n:'Zamfara',a:'ZA',lat:12.1699,lng:6.6577,lgas:14},
];

const ZONE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

// ══ COUNTRY DETECTION ══
// This is a coarse pre-geocode guess only — the US/Canada boxes below
// overlap almost entirely (Chicago, Toronto, Seattle, Vancouver, Montreal
// all match both), so neither check order gets it right for both countries.
// It's fine as a guess for which branch to run and how to key the cache;
// generatePostcodeWithAddress uses Nominatim's own geocoded country for the
// postcode, label, and fabrication decision once a lookup completes, which
// is what actually matters — see the comment there.
export function detectCountry(lat: number, lng: number): 'NG' | 'UK' | 'US' | 'CA' | 'WORLD' {
  if (lat >= 4 && lat <= 14 && lng >= 2.7 && lng <= 14.7) return 'NG';
  if (lat >= 49.9 && lat <= 60.9 && lng >= -8.2 && lng <= 1.8) return 'UK';
  if (lat >= 41.7 && lat <= 83 && lng >= -141 && lng <= -52) return 'CA';
  if (lat >= 24 && lat <= 49.5 && lng >= -125 && lng <= -66) return 'US';
  return 'WORLD';
}

export const COUNTRY_FLAGS: Record<string, string> = { NG: '🇳🇬', UK: '🇬🇧', US: '🇺🇸', CA: '🇨🇦', WORLD: '🌍' };

export function getCountryName(code: string): string {
  const map: Record<string, string> = { NG: 'Nigeria', UK: 'United Kingdom', US: 'United States', CA: 'Canada', WORLD: 'World' };
  return map[code] || code;
}

// ══ STATE LOOKUP ══
function findStateNG(lat: number, lng: number) {
  let best = STATES_NG[0], bd = Infinity;
  STATES_NG.forEach(s => { const d = Math.hypot(s.lat - lat, s.lng - lng); if (d < bd) { bd = d; best = s; } });
  return best;
}

export function getStatesNG() {
  return STATES_NG;
}

// ══ POSTCODE GENERATION (street-level: one postcode per ~100m block ≈ a small street cluster) ══
// 0.0009° ≈ 100 m. A slightly wider grid absorbs typical GPS jitter (20-60 m) so a
// user standing at the same spot gets the SAME postcode across multiple attempts,
// while still keeping codes tied to a specific street rather than a whole district.
const BLOCK = 0.0009;

// Round to 5 decimal places (~1.1 m) so we keep street-level fidelity while still
// absorbing sub-metre GPS jitter. The grid below is what actually controls dedup.
function stableCoords(lat: number, lng: number) {
  return {
    lat: Math.round(lat * 100000) / 100000,
    lng: Math.round(lng * 100000) / 100000,
  };
}

function stableGrid(lat: number, lng: number) {
  const sc = stableCoords(lat, lng);
  const gridLat = Math.floor((sc.lat - 4.0) / BLOCK);
  const gridLng = Math.floor((sc.lng - 2.7) / BLOCK);
  return { gridLat, gridLng };
}

function generateNigerianPostcode(lat: number, lng: number, lgaName?: string): string {
  return generateNigerianPostcodeForState(lat, lng, findStateNG(lat, lng), lgaName);
}

export function normalizeNigerianPostcodeDistrict(postcode: string): string {
  const compact = postcode.replace(/\s+/g, '').toUpperCase();
  const isNigerianPrefix = STATES_NG.some((state) => state.a === compact.slice(0, 2));
  if (isNigerianPrefix && /^[A-Z]{2}00[0-9][A-Z]{2}$/.test(compact)) {
    return `${compact.slice(0, 2)}01 ${compact.slice(-3)}`;
  }
  return postcode.trim().toUpperCase();
}

function generateNigerianPostcodeForState(
  lat: number,
  lng: number,
  s: typeof STATES_NG[number],
  lgaName?: string,
  areaName?: string,
): string {
  const { gridLat, gridLng } = stableGrid(lat, lng);
  const sy = Math.abs(gridLat) % 100;

  // Outward digits: mimic real postal systems (e.g. Glasgow G1/G20/G81) where the
  // same city/LGA has many district numbers depending on the neighbourhood. We
  // derive the 2-digit district from LGA + suburb/area when we have it, and
  // additionally mix in a coarse coordinate grid (~1.5 km cells) so different
  // parts of a large LGA like Ikeja or AMAC still get distinct districts even
  // when the geocoder returns the same suburb name.
  let sx: number;
  if (lgaName && lgaName.trim()) {
    // ~1.5 km sub-LGA cell: BLOCK is ~100 m, so /16 ≈ 1.6 km.
    const cellLat = Math.floor(gridLat / 16);
    const cellLng = Math.floor(gridLng / 16);
    const areaKey = (areaName || '').trim().toLowerCase();
    sx = simpleHash(`${s.n}|${lgaName.trim().toLowerCase()}|${areaKey}|${cellLat}|${cellLng}`) % 99;
  } else {
    sx = Math.abs(gridLng) % 99;
  }
  // Clamp to 01–99 (real postal systems don't use district 00).
  sx = sx + 1;

  const inward = String(sx).padStart(2, '0');
  const zi = (sx * 100 + sy) % (ZONE_CHARS.length * ZONE_CHARS.length);
  const zone = ZONE_CHARS[Math.floor(zi / ZONE_CHARS.length)] + ZONE_CHARS[zi % ZONE_CHARS.length];
  return normalizeNigerianPostcodeDistrict(`${s.a}${inward} ${sy % 10}${zone}`);
}

// Look up a STATES_NG entry by name (case-insensitive, tolerates "State" suffix and known aliases).
function stateByName(name?: string) {
  if (!name) return null;
  const cleaned = name.replace(/\s+state$/i, '').trim().toLowerCase();
  if (!cleaned) return null;
  const aliases: Record<string, string> = {
    'abuja': 'FCT',
    'federal capital territory': 'FCT',
    'nassarawa': 'Nasarawa',
  };
  const target = (aliases[cleaned] || cleaned).toLowerCase();
  return STATES_NG.find(s => s.n.toLowerCase() === target) || null;
}

// Legacy state codes (for backward compat with old data)
const STATE_CODES: Record<string, string> = {};
STATES_NG.forEach(s => { STATE_CODES[s.n] = s.a; });
STATE_CODES['Abuja'] = 'FC';
STATE_CODES['Nassarawa'] = 'NA';

// State number mapping for property storage
const STATE_NUMBERS: Record<string, number> = {};
STATES_NG.forEach((s, i) => { STATE_NUMBERS[s.n] = i + 1; });
STATE_NUMBERS['Abuja'] = 15;
STATE_NUMBERS['Nassarawa'] = 24;

/** Simple deterministic string hash */
function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export interface PostcodeResult {
  postcode: string;
  state: string;
  areaCode: string;
  lat: number;
  lng: number;
  address?: string;
  lga?: string;
  country?: string;
  countryCode?: string;
  road?: string;
  area?: string;
  isGenerated?: boolean;
}

// Snap coordinates to grid center for canonical storage
function snapToGrid(lat: number, lng: number): { lat: number; lng: number } {
  const sc = stableCoords(lat, lng);
  return {
    lat: Math.floor((sc.lat - 4.0) / BLOCK) * BLOCK + 4.0 + BLOCK / 2,
    lng: Math.floor((sc.lng - 2.7) / BLOCK) * BLOCK + 2.7 + BLOCK / 2,
  };
}

// Session cache
const postcodeCache = new Map<string, PostcodeResult>();

// ─── CORE: Spatial property lookup via PostGIS ───
async function findNearbyProperty(lat: number, lng: number, radius: number = 250): Promise<{
  id: string; postcode: string; lat: number; lng: number; state_name: string; lga_name: string; address: string; distance_meters: number;
} | null> {
  try {
    const { data, error } = await supabase.rpc('find_nearby_property', {
      user_lat: lat,
      user_lng: lng,
      radius_meters: radius,
    });
    if (error) { console.error('Spatial lookup error:', error); return null; }
    if (data && Array.isArray(data) && data.length > 0) return data[0];
    if (data && !Array.isArray(data)) return data;
    return null;
  } catch (e) {
    console.error('Spatial lookup failed:', e);
    return null;
  }
}

// ─── CORE: Create property with canonical coords ───
async function createProperty(
  rawLat: number, rawLng: number,
  postcode: string, stateName: string, lgaName: string, address: string
): Promise<void> {
  // Store REAL coordinates (not the snapped grid centre) so a shared/decoded
  // postcode pin lands on the exact spot the user generated it at, rather
  // than up to ~110 m away at the cell centre.
  const stateNum = STATE_NUMBERS[stateName] || 0;

  let lgaNum = 0;
  try {
    const { NIGERIAN_STATES } = await import('@/lib/nigerianStates');
    const stateData = NIGERIAN_STATES.find(s => s.name === stateName);
    if (stateData) {
      const idx = stateData.lgas.findIndex(l => l.toLowerCase() === lgaName.toLowerCase());
      lgaNum = idx >= 0 ? idx + 1 : 0;
    }
  } catch {}

  const wardNum = Math.abs(simpleHash(`${rawLat.toFixed(4)}|${rawLng.toFixed(4)}`)) % 50 + 1;

  try {
    await supabase.from('properties').insert({
      raw_lat: rawLat,
      raw_lng: rawLng,
      lat: rawLat,
      lng: rawLng,
      postcode,
      state_name: stateName,
      lga_name: lgaName,
      state_number: stateNum,
      lga_number: lgaNum,
      ward_number: wardNum,
      address: address || null,
      location: `SRID=4326;POINT(${rawLng} ${rawLat})`,
    } as any);
  } catch (e) {
    console.error('Failed to create property:', e);
  }
}

// ─── Quick postcode (sync, before spatial check) ───
export function generatePostcode(lat: number, lng: number): PostcodeResult {
  const country = detectCountry(lat, lng);
  if (country === 'NG') {
    const s = findStateNG(lat, lng);
    const postcode = generateNigerianPostcode(lat, lng);
    return { postcode, state: s.n, areaCode: s.a, lat, lng, isGenerated: true, country: 'Nigeria', countryCode: 'NG' };
  }
  // Non-Nigeria: return placeholder, will be resolved by async function
  return { postcode: '...', state: '', areaCode: '', lat, lng, isGenerated: true, country: getCountryName(country), countryCode: country };
}

// Reverse geocode to get actual address.
// Retries on a weak/flaky connection instead of giving up after one timeout —
// a single failed attempt used to fall straight through to a cruder
// postcode formula (see generatePostcodeWithAddress) that skips the LGA/area
// name entirely, producing a genuinely different postcode for the same spot
// than a successful lookup would. Retrying makes that mismatch far less
// likely without changing behaviour when the network is actually fine (the
// first attempt still succeeds immediately in that case).
export async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string; state: string; lga: string; country: string; countryCode: string; postcode: string; road: string; area: string;
}> {
  const attempts = [5000, 6000, 8000]; // widening timeout per retry
  for (let i = 0; i < attempts.length; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), attempts[i]);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const addr = data.address || {};
      const state = addr.state?.replace(' State', '') || '';
      const lga = addr.county || addr.city || addr.town || addr.village || '';
      const road = addr.road || '';
      const area = addr.suburb || addr.neighbourhood || addr.hamlet || addr.village || addr.town || addr.city || lga || '';
      const country = addr.country || '';
      const countryCode = (addr.country_code || '').toUpperCase();
      const postcode = addr.postcode || '';
      const parts = [road, area, lga].filter(Boolean);
      return {
        address: parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || 'Unknown location',
        state, lga, country, countryCode, postcode, road, area,
      };
    } catch {
      if (i < attempts.length - 1) continue; // try again
    }
  }
  return { address: '', state: '', lga: '', country: '', countryCode: '', postcode: '', road: '', area: '' };
}

// Write a resolved postcode into the persistent coordinate cache (fire-and-forget)
async function writeCoordinateCache(
  countryCode: string, lat: number, lng: number, r: PostcodeResult
): Promise<void> {
  try {
    // ~110 m grid (matches the offline cache and Nigeria's BLOCK) so typical
    // GPS jitter (10-50 m) still hits the same cache entry instead of
    // triggering a fresh Nominatim lookup that can return a neighbouring
    // postcode for what is really the same spot.
    const latKey = Math.round(lat * 1000) / 1000;
    const lngKey = Math.round(lng * 1000) / 1000;
    await supabase.rpc('upsert_coordinate_postcode_cache', {
      _country_code: countryCode,
      _lat: latKey,
      _lng: lngKey,
      _postcode: r.postcode,
      _state: r.state || '',
      _address: r.address || null,
      _area: r.area || null,
      _road: r.road || null,
      _lga: r.lga || null,
      _country: r.country || null,
      _is_generated: !!r.isGenerated,
    });
  } catch (e) {
    console.warn('Coordinate cache write failed', e);
  }
}

/**
 * MAIN FUNCTION: Generate postcode with spatial deduplication.
 * Uses the uploaded site's algorithm for Nigerian postcodes.
 * Uses real postcodes for UK/US/CA via reverse geocoding.
 */
export async function generatePostcodeWithAddress(lat: number, lng: number): Promise<PostcodeResult> {
  const country = detectCountry(lat, lng);
  // For Nigeria use the stable grid; for other countries use rounded coords
  // as cache key. 3 decimal places (~110 m) matches the offline cache and
  // Nigeria's BLOCK, so GPS jitter for the same spot doesn't miss the cache.
  const cacheKey = country === 'NG'
    ? `NG|${stableGrid(lat, lng).gridLat}|${stableGrid(lat, lng).gridLng}`
    : `${country}|${lat.toFixed(3)}|${lng.toFixed(3)}`;

  // 1. Session cache
  if (postcodeCache.has(cacheKey)) {
    const cached = postcodeCache.get(cacheKey)!;
    return { ...cached, postcode: normalizeNigerianPostcodeDistrict(cached.postcode), lat, lng };
  }

  // 1a. Offline / persistent IndexedDB cache (works without internet)
  const offlineExact = await readOfflinePostcode(country, lat, lng);
  if (offlineExact) {
    const normalized = { ...offlineExact, postcode: normalizeNigerianPostcodeDistrict(offlineExact.postcode) };
    postcodeCache.set(cacheKey, normalized);
    return { ...normalized, lat, lng };
  }
  if (!isOnline()) {
    const nearest = await findNearestOffline(country, lat, lng, 60);
    if (nearest) {
      const normalized = { ...nearest, postcode: normalizeNigerianPostcodeDistrict(nearest.postcode) };
      postcodeCache.set(cacheKey, normalized);
      return { ...normalized, lat, lng };
    }
    // Fully offline with no neighbour — fall back to local NG generator
    if (country === 'NG') {
      const s = findStateNG(lat, lng);
      const offline: PostcodeResult = {
        postcode: generateNigerianPostcode(lat, lng),
        state: s.n,
        areaCode: s.a,
        lat, lng,
        country: 'Nigeria',
        countryCode: 'NG',
        isGenerated: true,
      };
      void writeOfflinePostcode(country, lat, lng, offline);
      return offline;
    }
  }

  // 1b. DB coordinate cache (skip Nominatim for repeat lookups). Same ~110 m
  // rounding as writeCoordinateCache — must match or writes and reads would
  // key differently and never hit.
  if (country !== 'NG') {
    try {
      const latKey = Math.round(lat * 1000) / 1000;
      const lngKey = Math.round(lng * 1000) / 1000;
      const { data: cached } = await supabase.rpc('get_coordinate_postcode_cache', {
        _country_code: country,
        _lat: latKey,
        _lng: lngKey,
      });
      if (cached && cached.length > 0) {
        const c = cached[0];
        const result: PostcodeResult = {
          postcode: c.postcode,
          state: c.state,
          areaCode: c.postcode.split(' ')[0] || c.postcode.slice(0, 3),
          lat, lng,
          address: c.address || undefined,
          lga: c.lga || undefined,
          country: c.country || getCountryName(country),
          countryCode: country,
          road: c.road || undefined,
          area: c.area || undefined,
          isGenerated: c.is_generated,
        };
        postcodeCache.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.warn('Coordinate cache lookup failed', e);
    }
  }

  // 2. For Nigeria: spatial lookup then generate (1.5km radius to absorb GPS jitter)
  if (country === 'NG') {
    // Reuse an existing postcode only within ~40 m (same building / GPS-jitter
    // cluster). Wider radii cause people across the street or a few shops away
    // to inherit a postcode whose pin then looks noticeably far from them.
    const nearby = await findNearbyProperty(lat, lng, 40);
    // Always reverse-geocode so we can verify the cached postcode's state matches reality.
    const geo = await reverseGeocode(lat, lng);
    const stateFromGeoEarly = stateByName(geo.state);

    if (nearby) {
      const prefix = (nearby.postcode.match(/^[A-Z]{2}/)?.[0]) || '';
      const cachedStateOk = stateFromGeoEarly
        ? prefix === stateFromGeoEarly.a
        : true; // no geo state available — trust cache
      if (cachedStateOk) {
        const result: PostcodeResult = {
          postcode: normalizeNigerianPostcodeDistrict(nearby.postcode),
          state: stateFromGeoEarly?.n || nearby.state_name || findStateNG(lat, lng).n,
          areaCode: prefix || normalizeNigerianPostcodeDistrict(nearby.postcode).slice(0, 2),
          lat, lng,
          address: geo.address || nearby.address || undefined,
          lga: geo.lga || nearby.lga_name || undefined,
          road: geo.road || undefined,
          area: geo.area || undefined,
          country: 'Nigeria',
          countryCode: 'NG',
          isGenerated: true,
        };
        postcodeCache.set(cacheKey, result);
        return result;
      }
      // Otherwise fall through and regenerate with the correct state.
    }

    // Prefer the state Nominatim reports (it's authoritative). Fall back to nearest centroid.
    const s = stateFromGeoEarly || findStateNG(lat, lng);
    const realState = s.n;
    const postcode = generateNigerianPostcodeForState(lat, lng, s, geo.lga, geo.area);

    const result: PostcodeResult = {
      postcode,
      state: realState,
      areaCode: s.a,
      lat, lng,
      address: geo.address,
      lga: geo.lga,
      road: geo.road || undefined,
      area: geo.area || undefined,
      country: 'Nigeria',
      countryCode: 'NG',
      isGenerated: true,
    };

    // Only persist this postcode (properties table + offline cache) when the
    // reverse geocode actually succeeded (geo.lga present). If it failed even
    // after retries, `postcode` above was computed via the cruder no-LGA
    // formula branch — caching that permanently would "poison" this spot for
    // every future visitor with a low-confidence code, even after the network
    // recovers. Still return it for this one request so the user isn't stuck.
    if (geo.lga) {
      await createProperty(lat, lng, postcode, realState, geo.lga, geo.address || '');
      void writeOfflinePostcode(country, lat, lng, result);
    }
    postcodeCache.set(cacheKey, result);
    return result;
  }

  // 3. Non-Nigeria: use real postcodes from reverse geocoding
  const geo = await reverseGeocode(lat, lng);
  if (geo.postcode) {
    const result: PostcodeResult = {
      postcode: geo.postcode,
      state: geo.state || geo.lga || geo.country,
      areaCode: geo.postcode.split(' ')[0] || geo.postcode.slice(0, 2),
      lat, lng,
      address: geo.address,
      lga: geo.lga,
      country: geo.country,
      countryCode: geo.countryCode,
      road: geo.road || undefined,
      area: geo.area || undefined,
      isGenerated: false,
    };
    postcodeCache.set(cacheKey, result);
    void writeCoordinateCache(country, lat, lng, result);
    void writeOfflinePostcode(country, lat, lng, result);
    return result;
  }

  // 4. No real postcode from the first geocode attempt. Retry at a coarser
  // zoom, then give an honest "not found" result if that also comes up
  // empty — this runs for ANY non-Nigeria location, not just ones our coarse
  // bounding-box guess recognized as UK/US/CA. It used to fabricate a fake
  // grid-based code (like the Nigeria generator) for everything that fell
  // outside those boxes — which, given the US/UK/CA boxes don't cover
  // Alaska, Hawaii, the Channel Islands, etc., meant real places with real
  // postcodes could get handed back a made-up one. Never fabricate outside
  // Nigeria — always prefer geocoded truth, or say plainly it wasn't found.
  try {
    const res2 = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { 'User-Agent': 'Loca8tor/1.0 (https://loca8tor.com)' } },
    );
    const data2 = await res2.json();
    if (data2?.address?.postcode) {
      const result: PostcodeResult = {
        postcode: data2.address.postcode,
        state: data2.address.state?.replace(' State', '') || geo.state || getCountryName(country),
        areaCode: data2.address.postcode.split(' ')[0] || data2.address.postcode.slice(0, 3),
        lat, lng,
        address: geo.address,
        lga: geo.lga,
        country: geo.country || getCountryName(country),
        countryCode: geo.countryCode || country,
        isGenerated: false,
      };
      postcodeCache.set(cacheKey, result);
      void writeCoordinateCache(country, lat, lng, result);
      void writeOfflinePostcode(country, lat, lng, result);
      return result;
    }
  } catch {}

  const noPostcodeResult: PostcodeResult = {
    postcode: 'N/A',
    state: geo.state || getCountryName(country),
    areaCode: geo.countryCode || country,
    lat, lng,
    address: geo.address || 'Postcode not available for this exact location',
    country: geo.country || getCountryName(country),
    countryCode: geo.countryCode || country,
    isGenerated: false,
  };
  postcodeCache.set(cacheKey, noPostcodeResult);
  return noPostcodeResult;
}

// Legacy: Lookup existing postcode from old postcodes table by coords
async function lookupPostcodeByCoords(sLat: number, sLng: number): Promise<PostcodeResult | null> {
  try {
    const tolerance = 0.003;
    const { data } = await supabase.from('postcodes')
      .select('id, postcode, address, state, country, lga, lat, lng, created_at')
      .gte('lat', sLat - tolerance).lte('lat', sLat + tolerance)
      .gte('lng', sLng - tolerance).lte('lng', sLng + tolerance)
      .order('created_at', { ascending: true }).limit(1);
    if (data && data.length > 0) {
      const match = data[0];
      const postcode = normalizeNigerianPostcodeDistrict(match.postcode);
      return {
        postcode, state: match.state,
        areaCode: postcode.split(' ')[0] || postcode.slice(0, 2),
        lat: match.lat, lng: match.lng,
        address: match.address || undefined, lga: match.lga || undefined,
        country: match.country || undefined, isGenerated: true,
      };
    }
  } catch (e) { console.error('DB coord lookup failed:', e); }
  return null;
}

// Re-export for backward compatibility
export function generateCodeFromArea(state: string, area: string): string {
  const areaCode = STATE_CODES[state] || 'NG';
  const normalized = area.trim().toLowerCase().replace(/\s+/g, ' ');
  const hash = simpleHash(`${normalized}|${state}`);
  const district = (hash % 9) + 1;
  const letters = 'ABCDEFGHJKLMNPRSTUWXY';
  const sector = ((hash >>> 4) % 9) + 1;
  const u1 = letters[hash % letters.length];
  const u2 = letters[(hash >>> 8) % letters.length];
  return `${areaCode}${district} ${sector}${u1}${u2}`;
}
