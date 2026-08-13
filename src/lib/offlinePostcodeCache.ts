import { get, set, keys, del } from 'idb-keyval';
import type { PostcodeResult } from './postcodeGenerator';

// IndexedDB-backed cache so generated postcodes survive offline relaunches.
// Key format: country|gridLat|gridLng (matches in-memory cacheKey shape).

const PREFIX = 'pc:';
const MAX_ENTRIES = 500;

export type CachedPostcode = PostcodeResult & { cachedAt: number };

function buildKey(country: string, lat: number, lng: number): string {
  // Round to ~110m grid so nearby reads hit the cache offline.
  const la = Math.round(lat * 1000) / 1000;
  const ln = Math.round(lng * 1000) / 1000;
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