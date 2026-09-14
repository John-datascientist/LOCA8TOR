import { get, set, keys, del } from 'idb-keyval';
import type { PostcodeResult } from './postcodeGenerator';

// IndexedDB-backed cache so generated postcodes survive offline relaunches.
// Key format: country|gridLat|gridLng (matches in-memory cacheKey shape).

const PREFIX = 'pc:';
const MAX_ENTRIES = 500;

export type CachedPostcode = PostcodeResult & { cachedAt: number };

/**
 * Rounds a coordinate to the cache grid for a country. Every cache — the
 * in-memory session map, this IndexedDB store, and the shared
 * coordinate_postcode_cache table — must round identically, or writes and
 * reads key differently and never hit.
 *
 * Nigeria uses ~110 m (3dp) to match Loca8tor's own generated grid: we mint
 * one postcode per ~100 m BLOCK there, so a coarser bucket is exactly right
 * and absorbs GPS jitter for free.
 *
 * Everywhere else we return REAL postcodes, and real postcode units are far
 * smaller than 110 m — a UK unit is often one side of one street. At 3dp a
 * whole 110 m x 70 m cell collapsed to whichever postcode happened to be
 * looked up first, and because the DB cache is shared across all users, that
 * first answer was then served to everyone else in the cell. That is why UK
 * lookups kept returning a neighbouring area's postcode. 4dp is ~11 m of
 * latitude (~7 m of longitude at UK latitudes) — tight enough not to merge
 * adjacent postcode units, still coarse enough that a stationary device's
 * jitter reuses the entry.
 */
export function roundToCacheGrid(country: string, value: number): number {
  const factor = country === 'NG' ? 1000 : 10000;
  return Math.round(value * factor) / factor;
}

function buildKey(country: string, lat: number, lng: number): string {
  const la = roundToCacheGrid(country, lat);
  const ln = roundToCacheGrid(country, lng);
  return `${PREFIX}${country}|${la}|${ln}`;
}

export async function readOfflinePostcode(
  country: string,
  lat: number,
  lng: number,
): Promise<CachedPostcode | null> {
  try {
    const v = await get<CachedPostcode>(buildKey(country, lat, lng));
    return v ?? null;
  } catch {
    return null;
  }
}

export async function writeOfflinePostcode(
  country: string,
  lat: number,
  lng: number,
  result: PostcodeResult,
): Promise<void> {
  try {
    const payload: CachedPostcode = { ...result, cachedAt: Date.now() };
    await set(buildKey(country, lat, lng), payload);
    // Lightweight cap (best-effort) so storage stays bounded.
    const all = await keys();
    const ours = all.filter((k) => typeof k === 'string' && (k as string).startsWith(PREFIX));
    if (ours.length > MAX_ENTRIES) {
      const drop = ours.slice(0, ours.length - MAX_ENTRIES);
      await Promise.all(drop.map((k) => del(k)));
    }
  } catch {
    // best-effort
  }
}

export async function findNearestOffline(
  country: string,
  lat: number,
  lng: number,
  radiusMeters = 1500,
): Promise<CachedPostcode | null> {
  try {
    const all = await keys();
    let best: CachedPostcode | null = null;
    let bestDist = Infinity;
    for (const k of all) {
      if (typeof k !== 'string' || !k.startsWith(`${PREFIX}${country}|`)) continue;
      const v = await get<CachedPostcode>(k);
      if (!v) continue;
      const d = haversine(lat, lng, v.lat, v.lng);
      if (d < bestDist) {
        bestDist = d;
        best = v;
      }
    }
    return bestDist <= radiusMeters ? best : null;
  } catch {
    return null;
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
