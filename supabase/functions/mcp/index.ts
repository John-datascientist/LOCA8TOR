// Loca8tor MCP server.
//
// Hand-maintained. Previously this file was regenerated on every build by
// the @lovable.dev/mcp-js Vite plugin from src/lib/mcp/*. That plugin is
// gone, so this is now the single source of truth — edit it directly to
// add/change tools.
//
// Implements MCP's Streamable HTTP transport (2025-06-18) directly against
// Deno's Request/Response rather than pulling in the @modelcontextprotocol/sdk
// Node transport, which does not target Deno's fetch-style server API.
// Supabase Auth (GoTrue) is the OAuth 2.1 authorization server — this
// function is only ever the resource server: it validates bearer tokens via
// supabase.auth.getUser() and advertises the issuer via the RFC 9728
// protected-resource-metadata endpoint.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.108.2";
import { z, type ZodTypeAny } from "npm:zod@3.25.76";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mcp`;
const ISSUER_URL = `${SUPABASE_URL}/auth/v1`;
const PROTOCOL_VERSION = "2025-06-18";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Nigeria postcode generation (shared by the two generate_* tools below)
// ---------------------------------------------------------------------------

const STATES_NG = [
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

function isInNigeria(lat: number, lng: number) {
  return lat >= 4 && lat <= 14 && lng >= 2.7 && lng <= 14.7;
}
function findStateNG(lat: number, lng: number) {
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
function normalizeDistrict(postcode: string) {
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

function extractLgaArea(addr: Record<string, string | undefined>) {
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
function generateNigerianPostcodeForState(
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

async function reverseGeocodeNG(lat: number, lng: number): Promise<{ lga: string; area: string; address: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { signal: controller.signal, headers: { "User-Agent": "Loca8tor-MCP/1.0 (https://loca8tor.com)" } },
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

async function geocodeAddressNG(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ng");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Loca8tor-MCP/1.0 (https://loca8tor.com)" },
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

// ─── Spatial dedup against the same `properties` table the web app uses, so
// a postcode generated here is stable with (and reusable by) the app. ───
type NearbyPropertyNG = { postcode: string; state_name: string; lga_name: string; address: string };

async function findNearbyPropertyNG(db: SupabaseClient, lat: number, lng: number): Promise<NearbyPropertyNG | null> {
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

async function insertPropertyNG(
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

// ---------------------------------------------------------------------------
// Tool framework
// ---------------------------------------------------------------------------

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: unknown;
  isError?: boolean;
};

type ToolCtx = {
  token: string;
  userId: string;
  supabaseForUser: () => SupabaseClient;
};

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodTypeAny;
  annotations: { readOnlyHint: boolean; idempotentHint: boolean; openWorldHint: boolean };
  handler: (input: Record<string, unknown>, ctx: ToolCtx) => Promise<ToolResult>;
};

function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  if (!(schema instanceof z.ZodObject)) return { type: "object", properties: {} };
  const shape = schema.shape as Record<string, ZodTypeAny>;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    const optional = value.isOptional();
    const inner = optional ? (value._def as { innerType: ZodTypeAny }).innerType ?? value : value;
    const type =
      inner instanceof z.ZodNumber ? "number" : inner instanceof z.ZodString ? "string" : "string";
    const desc = (inner as ZodTypeAny).description;
    properties[key] = desc ? { type, description: desc } : { type };
    if (!optional) required.push(key);
  }
  return { type: "object", properties, ...(required.length ? { required } : {}) };
}

async function saveLookup(
  ctx: ToolCtx,
  row: {
    postcode: string;
    state: string;
    area_code: string;
    latitude: number;
    longitude: number;
    label: string | null;
    address: string | null;
    source: string;
  },
): Promise<string | null> {
  try {
    const { data, error } = await ctx
      .supabaseForUser()
      .from("mcp_postcode_lookups")
      .insert({ user_id: ctx.userId, ...row })
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("saveLookup failed", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("saveLookup exception", e);
    return null;
  }
}

const TOOLS: Tool[] = [
  {
    name: "get_my_profile",
    title: "Get my Loca8tor profile",
    description:
      "Returns the signed-in user's Loca8tor profile: full name, phone, location, account type (individual, rider, business), business name/code if any, and subscription status.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: async (_input, ctx) => {
      const { data, error } = await ctx
        .supabaseForUser()
        .from("riders")
        .select(
          "full_name, phone, location, account_type, business_name, business_code, business_size, subscription_status, trial_ends_at, referral_code",
        )
        .eq("user_id", ctx.userId)
        .maybeSingle();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      if (!data) {
        return {
          content: [{ type: "text", text: "No Loca8tor profile found for this account." }],
          structuredContent: { profile: null },
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: { profile: data },
      };
    },
  },
  {
    name: "get_my_wallet_balance",
    title: "Get my Loca8tor wallet balance",
    description:
      "Returns the signed-in user's Loca8tor wallet balances in Naira: personal referral balance and, if the account is a business, the business wallet balance.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: async (_input, ctx) => {
      const supabase = ctx.supabaseForUser();
      const [{ data: refBal }, { data: bizWallet }] = await Promise.all([
        supabase.from("user_referral_balances").select("balance").eq("user_id", ctx.userId).maybeSingle(),
        supabase.from("business_wallets").select("balance").eq("user_id", ctx.userId).maybeSingle(),
      ]);
      const summary = {
        referral_balance_ngn: Number(refBal?.balance ?? 0),
        business_wallet_balance_ngn: bizWallet ? Number(bizWallet.balance ?? 0) : null,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        structuredContent: summary,
      };
    },
  },
  {
    name: "list_my_recent_deliveries",
    title: "List my recent Loca8tor deliveries",
    description:
      "Lists the signed-in user's recent deliveries (as customer sender, rider, or business owner, based on which of those roles the account has). Returns up to 20 rows with tracking code, status, pickup, drop-off, and created time.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(20).optional().describe("Max rows to return (1-20, default 10)."),
    }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: async (input, ctx) => {
      const cap = typeof input.limit === "number" ? input.limit : 10;
      const { data, error } = await ctx
        .supabaseForUser()
        .from("rider_delivery_logs")
        .select("id, customer_name, from_postcode, to_postcode, status, created_at")
        .order("created_at", { ascending: false })
        .limit(cap);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return {
        content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
        structuredContent: { deliveries: data ?? [] },
      };
    },
  },
  {
    name: "generate_nigeria_postcode",
    title: "Generate Nigeria postcode from coordinates",
    description:
      "Generates a Loca8tor Nigeria postcode from GPS coordinates. Pass the caller's current location (from the device's GPS) or a pin they selected on a map — provide `latitude` and `longitude` in decimal degrees. Returns the postcode, matched Nigerian state, and area code. Checks for a postcode already issued within ~40m of this spot (by this tool or the Loca8tor app) and reuses it, so the same location keeps the same postcode instead of drifting between calls. Coordinates outside Nigeria (approx. lat 4-14, lng 2.7-14.7) are rejected.",
    inputSchema: z.object({
      latitude: z.number().describe("Latitude in decimal degrees (WGS84)."),
      longitude: z.number().describe("Longitude in decimal degrees (WGS84)."),
      label: z.string().optional().describe("Optional human label for the pin (e.g. address or place name), echoed back in the result."),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
    handler: async (input, ctx) => {
      const latitude = input.latitude as number;
      const longitude = input.longitude as number;
      const label = (input.label as string | undefined) ?? null;
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return {
          content: [{ type: "text", text: "Invalid coordinates. Latitude must be -90..90 and longitude -180..180." }],
          isError: true,
        };
      }
      if (!isInNigeria(latitude, longitude)) {
        return {
          content: [
            { type: "text", text: `Those coordinates (${latitude}, ${longitude}) are outside Nigeria. This tool only generates Nigerian postcodes.` },
          ],
          isError: true,
        };
      }

      const s = findStateNG(latitude, longitude);
      const db = ctx.supabaseForUser();
      const nearby = await findNearbyPropertyNG(db, latitude, longitude);

      let postcode: string, state: string, areaCode: string, address: string | null, lga: string | undefined;
      if (nearby && nearby.postcode.slice(0, 2).toUpperCase() === s.a) {
        postcode = normalizeDistrict(nearby.postcode);
        state = nearby.state_name || s.n;
        areaCode = s.a;
        address = nearby.address || null;
        lga = nearby.lga_name || undefined;
      } else {
        const geo = await reverseGeocodeNG(latitude, longitude);
        const generated = generateNigerianPostcodeForState(latitude, longitude, s, geo?.lga, geo?.area);
        postcode = generated.postcode;
        state = generated.state;
        areaCode = generated.areaCode;
        address = geo?.address || null;
        lga = geo?.lga || undefined;
        void insertPropertyNG(db, latitude, longitude, postcode, state, geo?.lga || "", address || "");
      }

      const savedId = await saveLookup(ctx, {
        postcode,
        state,
        area_code: areaCode,
        latitude,
        longitude,
        label,
        address,
        source: "coordinates",
      });
      const result = {
        postcode,
        state,
        areaCode,
        country: "Nigeria",
        countryCode: "NG",
        latitude,
        longitude,
        label,
        address,
        lga,
        mapUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`,
        historyId: savedId,
      };
      return {
        content: [
          {
            type: "text",
            text: `Postcode: ${postcode}\nState: ${state}\nCoordinates: ${latitude}, ${longitude}${label ? `\nLocation: ${label}` : ""}`,
          },
        ],
        structuredContent: result,
      };
    },
  },
  {
    name: "generate_nigeria_postcode_from_address",
    title: "Generate Nigeria postcode from an address or place",
    description:
      "Generates a Loca8tor Nigeria postcode from a street address, landmark, or place name (e.g. 'Ikeja City Mall, Lagos' or '12 Adeola Odeku Street, Victoria Island'). The address is geocoded via OpenStreetMap (restricted to Nigeria) to get coordinates and LGA/area context. Checks for a postcode already issued within ~40m of the resolved spot (by this tool or the Loca8tor app) and reuses it, so repeated lookups of the same place stay consistent. Returns the postcode, matched Nigerian state, resolved coordinates, and the geocoder's canonical address. Saves the result to the caller's postcode-lookup history.",
    inputSchema: z.object({
      address: z.string().trim().min(3).describe("Street address, landmark, or place name to look up in Nigeria."),
      label: z.string().optional().describe("Optional friendly label to save with this lookup (e.g. 'Home', 'Warehouse')."),
    }),
    annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (input, ctx) => {
      const address = input.address as string;
      const label = (input.label as string | undefined) ?? null;
      let geo;
      try {
        geo = await geocodeAddressNG(address);
      } catch (e) {
        return { content: [{ type: "text", text: `Address lookup failed: ${(e as Error).message}` }], isError: true };
      }
      if (!geo) {
        return {
          content: [{ type: "text", text: `No match found in Nigeria for "${address}". Try a more specific address or landmark.` }],
          isError: true,
        };
      }
      if (!isInNigeria(geo.latitude, geo.longitude)) {
        return {
          content: [{ type: "text", text: `Resolved location is outside Nigeria (${geo.displayName}).` }],
          isError: true,
        };
      }

      const s = findStateNG(geo.latitude, geo.longitude);
      const db = ctx.supabaseForUser();
      const nearby = await findNearbyPropertyNG(db, geo.latitude, geo.longitude);

      let postcode: string, state: string, areaCode: string;
      if (nearby && nearby.postcode.slice(0, 2).toUpperCase() === s.a) {
        postcode = normalizeDistrict(nearby.postcode);
        state = nearby.state_name || s.n;
        areaCode = s.a;
      } else {
        const generated = generateNigerianPostcodeForState(geo.latitude, geo.longitude, s, geo.lga, geo.area);
        postcode = generated.postcode;
        state = generated.state;
        areaCode = generated.areaCode;
        void insertPropertyNG(db, geo.latitude, geo.longitude, postcode, state, geo.lga || "", geo.displayName || "");
      }

      const savedId = await saveLookup(ctx, {
        postcode,
        state,
        area_code: areaCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        label,
        address: geo.displayName,
        source: "address",
      });
      const result = {
        postcode,
        state,
        areaCode,
        country: "Nigeria",
        countryCode: "NG",
        latitude: geo.latitude,
        longitude: geo.longitude,
        address: geo.displayName,
        lga: geo.lga || undefined,
        query: address,
        label,
        mapUrl: `https://www.openstreetmap.org/?mlat=${geo.latitude}&mlon=${geo.longitude}#map=18/${geo.latitude}/${geo.longitude}`,
        historyId: savedId,
      };
      return {
        content: [
          {
            type: "text",
            text: `Postcode: ${postcode}\nState: ${state}\nResolved address: ${geo.displayName}\nCoordinates: ${geo.latitude}, ${geo.longitude}${label ? `\nLabel: ${label}` : ""}`,
          },
        ],
        structuredContent: result,
      };
    },
  },
  {
    name: "list_my_postcode_lookups",
    title: "List my recent MCP postcode lookups",
    description:
      "Returns the signed-in user's recent Nigerian postcode lookups generated via the MCP tools, most recent first. Each entry includes the postcode, state, coordinates, saved label, resolved address (when generated from an address), and the source (coordinates or address). Use this to retrieve and reuse a previously generated postcode.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).optional().describe("Maximum number of lookups to return (default 20, max 100)."),
      search: z.string().trim().optional().describe("Optional filter: case-insensitive match against postcode, label, or address."),
    }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: async (input, ctx) => {
      const limit = (input.limit as number | undefined) ?? 20;
      const search = input.search as string | undefined;
      let q = ctx
        .supabaseForUser()
        .from("mcp_postcode_lookups")
        .select("id, postcode, state, area_code, latitude, longitude, label, address, source, created_at")
        .eq("user_id", ctx.userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (search && search.length > 0) {
        const s = search.replace(/[%_]/g, "");
        q = q.or(`postcode.ilike.%${s}%,label.ilike.%${s}%,address.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) {
        return { content: [{ type: "text", text: `Failed to load lookups: ${error.message}` }], isError: true };
      }
      const rows = data ?? [];
      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "No saved postcode lookups yet." }],
          structuredContent: { lookups: [], count: 0 },
        };
      }
      const summary = rows
        .map(
          (r) =>
            `• ${r.postcode} — ${r.state}${r.label ? ` (${r.label})` : ""}${r.address ? `\n    ${r.address}` : ""}\n    ${r.latitude}, ${r.longitude} · ${new Date(r.created_at).toISOString()}`,
        )
        .join("\n");
      return {
        content: [{ type: "text", text: `${rows.length} saved lookup(s):\n${summary}` }],
        structuredContent: { lookups: rows, count: rows.length },
      };
    },
  },
];

const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

// ---------------------------------------------------------------------------
// MCP JSON-RPC over Streamable HTTP
// ---------------------------------------------------------------------------

type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

function jsonRpcResult(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function jsonRpcError(id: string | number | null | undefined, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handleRpc(body: JsonRpcRequest, ctx: ToolCtx) {
  switch (body.method) {
    case "initialize":
      return jsonRpcResult(body.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "loca8tor-mcp", title: "Loca8tor", version: "0.1.0" },
        instructions:
          "Tools for the Loca8tor delivery & postcode app. Use `get_my_profile` for the signed-in user's account, `get_my_wallet_balance` for their wallet, `list_my_recent_deliveries` for their recent deliveries, `generate_nigeria_postcode` to turn GPS coordinates into a Nigerian postcode, `generate_nigeria_postcode_from_address` to turn a Nigerian address or place name into a postcode via reverse geocoding, and `list_my_postcode_lookups` to retrieve the user's previously generated postcodes. Postcode generations are automatically saved to the signed-in user's history. Account tools act as the signed-in user; per-user RLS applies.",
      });
    case "notifications/initialized":
      return null; // notification, no response
    case "tools/list":
      return jsonRpcResult(body.id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: zodToJsonSchema(t.inputSchema),
          annotations: t.annotations,
        })),
      });
    case "tools/call": {
      const name = body.params?.name as string | undefined;
      const args = (body.params?.arguments as Record<string, unknown> | undefined) ?? {};
      const tool = name ? TOOLS_BY_NAME.get(name) : undefined;
      if (!tool) return jsonRpcError(body.id, -32602, `Unknown tool: ${name}`);
      const parsed = tool.inputSchema.safeParse(args);
      if (!parsed.success) {
        return jsonRpcResult(body.id, {
          content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
          isError: true,
        });
      }
      try {
        const result = await tool.handler(parsed.data as Record<string, unknown>, ctx);
        return jsonRpcResult(body.id, result);
      } catch (e) {
        return jsonRpcResult(body.id, { content: [{ type: "text", text: (e as Error).message }], isError: true });
      }
    }
    default:
      return jsonRpcError(body.id, -32601, `Method not found: ${body.method}`);
  }
}

// ---------------------------------------------------------------------------
// HTTP entrypoint
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const url = new URL(req.url);

  // RFC 9728 Protected Resource Metadata — lets MCP clients discover that
  // Supabase Auth is the authorization server for this resource.
  if (url.pathname.endsWith("/.well-known/oauth-protected-resource")) {
    return Response.json(
      { resource: FUNCTION_URL, authorization_servers: [ISSUER_URL] },
      { headers: CORS_HEADERS },
    );
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  let ctx: ToolCtx | null = null;
  if (token) {
    const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data, error } = await anon.auth.getUser(token);
    if (!error && data.user) {
      ctx = {
        token,
        userId: data.user.id,
        supabaseForUser: () =>
          createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          }),
      };
    }
  }

  // Whole endpoint requires auth (matches the original auth.oauth.issuer()
  // server-level gate). 401 + WWW-Authenticate is what tells MCP clients to
  // start the OAuth flow via the protected-resource metadata above.
  if (!ctx) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        ...CORS_HEADERS,
        "WWW-Authenticate": `Bearer resource_metadata="${FUNCTION_URL}/.well-known/oauth-protected-resource"`,
      },
    });
  }

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await req.json();
  } catch {
    return Response.json(jsonRpcError(null, -32700, "Parse error"), { status: 400, headers: CORS_HEADERS });
  }

  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map((m) => handleRpc(m, ctx)))).filter(Boolean);
    return Response.json(results, { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }

  const result = await handleRpc(body, ctx);
  if (result === null) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }
  return Response.json(result, { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
});
