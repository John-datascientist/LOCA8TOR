// Nigeria postcode generation — shared by supabase/functions/mcp and
// supabase/functions/api-v1. This used to be hand-duplicated in both
// (and in src/lib/postcodeGenerator.ts, the client-side version) with a
// comment warning about drift risk; this module is the single Deno-side
// source of truth so the two edge functions can't disagree with each
// other. The hash/grid algorithm itself must still match
// src/lib/postcodeGenerator.ts exactly (different runtime, can't literally
// share the file) — if you change one, change both.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.108.2";

export const STATES_NG = [
  { n: "Abia", a: "AB", lat: 5.4527, lng: 7.5248 },
  { n: "Adamawa", a: "AD", lat: 9.3265, lng: 12.3984 },
  { n: "Akwa Ibom", a: "AK", lat: 5.0077, lng: 7.8537 },
  { n: "Anambra", a: "AN", lat: 6.2209, lng: 7.0669 },
  { n: "Bauchi", a: "BA", lat: 10.3158, lng: 9.8442 },
  { n: "Bayelsa", a: "BY", lat: 4.7719, lng: 6.0699 },
  { n: "Benue", a: "BE", lat: 7.3369, lng: 8.7408 },
  { n: "Borno", a: "BO", lat: 11.8333, lng: 13.15 },
  { n: "Cross River", a: "CR", lat: 5.8702, lng: 8.5988 },
  { n: "Delta", a: "DE", lat: 5.8904, lng: 5.6804 },
  { n: "Ebonyi", a: "EB", lat: 6.2649, lng: 8.0137 },
  { n: "Edo", a: "ED", lat: 6.335, lng: 5.6037 },
  { n: "Ekiti", a: "EK", lat: 7.719, lng: 5.311 },
  { n: "Enugu", a: "EN", lat: 6.4584, lng: 7.5464 },
  { n: "FCT", a: "FC", lat: 9.0765, lng: 7.3986 },
  { n: "Gombe", a: "GO", lat: 10.2791, lng: 11.167 },
  { n: "Imo", a: "IM", lat: 5.572, lng: 7.0588 },
  { n: "Jigawa", a: "JI", lat: 12.228, lng: 9.5616 },
  { n: "Kaduna", a: "KD", lat: 10.5222, lng: 7.4383 },
  { n: "Kano", a: "KN", lat: 12.0022, lng: 8.592 },
  { n: "Katsina", a: "KT", lat: 12.9908, lng: 7.6017 },
  { n: "Kebbi", a: "KB", lat: 12.4539, lng: 4.1975 },
  { n: "Kogi", a: "KO", lat: 7.7337, lng: 6.6906 },
  { n: "Kwara", a: "KW", lat: 8.9669, lng: 4.3874 },
  { n: "Lagos", a: "LA", lat: 6.5244, lng: 3.3792 },
  { n: "Nasarawa", a: "NA", lat: 8.4966, lng: 8.5254 },
  { n: "Niger", a: "NI", lat: 9.9309, lng: 5.5983 },
  { n: "Ogun", a: "OG", lat: 7.1601, lng: 3.3497 },
  { n: "Ondo", a: "ON", lat: 7.2508, lng: 5.1952 },
  { n: "Osun", a: "OS", lat: 7.5629, lng: 4.52 },
  { n: "Oyo", a: "OY", lat: 7.3775, lng: 3.947 },
  { n: "Plateau", a: "PL", lat: 9.2182, lng: 9.5179 },
  { n: "Rivers", a: "RI", lat: 4.8396, lng: 6.9114 },
  { n: "Sokoto", a: "SO", lat: 13.0545, lng: 5.2225 },
  { n: "Taraba", a: "TA", lat: 7.8699, lng: 10.0158 },
  { n: "Yobe", a: "YO", lat: 12.2939, lng: 11.439 },
  { n: "Zamfara", a: "ZA", lat: 12.1699, lng: 6.6577 },
];
const ZONE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const BLOCK = 9e-4;

export function isInNigeria(lat: number, lng: number) {
  return lat >= 4 && lat <= 14 && lng >= 2.7 && lng <= 14.7;
}
export function findStateNG(lat: number, lng: number) {
  let best = STATES_NG[0];
  let bd = Infinity;
  for (const s of STATES_NG) {
    const d = Math.hypot(s.lat - lat, s.lng - lng);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}
function stableGrid(lat: number, lng: number) {
  const roundedLat = Math.round(lat * 1e5) / 1e5;
  const roundedLng = Math.round(lng * 1e5) / 1e5;
  return {
    gridLat: Math.floor((roundedLat - 4) / BLOCK),
    gridLng: Math.floor((roundedLng - 2.7) / BLOCK),
  };
}
export function normalizeDistrict(postcode: string) {
  const compact = postcode.replace(/\s+/g, "").toUpperCase();
  const isNgPrefix = STATES_NG.some((s) => s.a === compact.slice(0, 2));
  if (isNgPrefix && /^[A-Z]{2}00[0-9][A-Z]{2}$/.test(compact)) {
    return `${compact.slice(0, 2)}01 ${compact.slice(-3)}`;
  }
  return postcode.trim().toUpperCase();
}
/** Simple deterministic string hash (same algorithm as src/lib/postcodeGenerator.ts). */
function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function extractLgaArea(addr: Record<string, string | undefined>) {
  const lga = addr.county || addr.city || addr.town || addr.village || "";
  const area =
    addr.suburb || addr.neighbourhood || addr.hamlet || addr.village || addr.town || addr.city || lga || "";
  return { lga, area };
}

// District (sx) is derived from LGA + area + a coarse ~1.5km cell when we
// have geocoded context, matching src/lib/postcodeGenerator.ts exactly —
// this is what lets a postcode generated here match one the web app would
// generate for the same spot, instead of two different algorithms drifting
// apart. Falls back to grid-only when no LGA is known (e.g. geocoding failed).
export function generateNigerianPostcodeForState(
  lat: number,
  lng: number,
  s: (typeof STATES_NG)[number],
  lgaName?: string,
  areaName?: string,
) {
  const { gridLat, gridLng } = stableGrid(lat, lng);
  const sy = Math.abs(gridLat) % 100;
  let sx: number;
  if (lgaName && lgaName.trim()) {
    const cellLat = Math.floor(gridLat / 16);
    const cellLng = Math.floor(gridLng / 16);
    const areaKey = (areaName || "").trim().toLowerCase();
    sx = simpleHash(`${s.n}|${lgaName.trim().toLowerCase()}|${areaKey}|${cellLat}|${cellLng}`) % 99;
  } else {
    sx = Math.abs(gridLng) % 99;
  }
  sx = sx + 1;
  const inward = String(sx).padStart(2, "0");
  const zi = (sx * 100 + sy) % (ZONE_CHARS.length * ZONE_CHARS.length);
  const zone =
    ZONE_CHARS[Math.floor(zi / ZONE_CHARS.length)] + ZONE_CHARS[zi % ZONE_CHARS.length];
  return {
    postcode: normalizeDistrict(`${s.a}${inward} ${sy % 10}${zone}`),
    state: s.n,
    areaCode: s.a,
  };
}

export async function reverseGeocodeNG(lat: number, lng: number): Promise<{ lga: string; area: string; address: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { signal: controller.signal, headers: { "User-Agent": "Loca8tor/1.0 (https://loca8tor.com)" } },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const { lga, area } = extractLgaArea(addr);
    const parts = [addr.road || "", area, lga].filter(Boolean);
    return { lga, area, address: parts.join(", ") || data.display_name || "" };
  } catch {
    return null;
  }
}

export async function geocodeAddressNG(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ng");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Loca8tor/1.0 (https://loca8tor.com)" },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const rows = await res.json();
  if (!rows.length) return null;
  const { lga, area } = extractLgaArea(rows[0].address || {});
  return {
    latitude: parseFloat(rows[0].lat),
    longitude: parseFloat(rows[0].lon),
    displayName: rows[0].display_name as string,
    lga,
    area,
  };
}

// Spatial dedup against the same `properties` table the web app uses, so a
// postcode generated here is stable with (and reusable by) the app.
export type NearbyPropertyNG = { postcode: string; state_name: string; lga_name: string; address: string };

export async function findNearbyPropertyNG(db: SupabaseClient, lat: number, lng: number): Promise<NearbyPropertyNG | null> {
  try {
    const { data, error } = await db.rpc("find_nearby_property", {
      user_lat: lat,
      user_lng: lng,
      radius_meters: 40,
    });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  } catch {
    return null;
  }
}

export async function insertPropertyNG(
  db: SupabaseClient,
  lat: number,
  lng: number,
  postcode: string,
  stateName: string,
  lgaName: string,
  address: string,
): Promise<void> {
  try {
    const { error } = await db.from("properties").insert({
      raw_lat: lat,
      raw_lng: lng,
      lat,
      lng,
      postcode,
      state_name: stateName,
      lga_name: lgaName || null,
      address: address || null,
      location: `SRID=4326;POINT(${lng} ${lat})`,
    });
    if (error) console.error("insertPropertyNG failed", error.message);
  } catch (e) {
    console.error("insertPropertyNG exception", e);
  }
}

/**
 * Full generate-or-reuse flow: dedup against `properties` within 40m, else
 * reverse-geocode + generate + persist. Shared by the MCP tool and the
 * public REST /v1/postcode endpoint so both return identical results for
 * the same spot.
 */
export async function resolvePostcodeForCoords(
  db: SupabaseClient,
  lat: number,
  lng: number,
): Promise<{ postcode: string; state: string; areaCode: string; address: string | null; lga: string | undefined }> {
  const s = findStateNG(lat, lng);
  const nearby = await findNearbyPropertyNG(db, lat, lng);

  if (nearby && nearby.postcode.slice(0, 2).toUpperCase() === s.a) {
    return {
      postcode: normalizeDistrict(nearby.postcode),
      state: nearby.state_name || s.n,
      areaCode: s.a,
      address: nearby.address || null,
      lga: nearby.lga_name || undefined,
    };
  }

  const geo = await reverseGeocodeNG(lat, lng);
  const generated = generateNigerianPostcodeForState(lat, lng, s, geo?.lga, geo?.area);
  void insertPropertyNG(db, lat, lng, generated.postcode, generated.state, geo?.lga || "", geo?.address || "");
  return {
    postcode: generated.postcode,
    state: generated.state,
    areaCode: generated.areaCode,
    address: geo?.address || null,
    lga: geo?.lga || undefined,
  };
}
