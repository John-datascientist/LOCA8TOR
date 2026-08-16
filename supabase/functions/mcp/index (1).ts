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
import {
  findNearbyPropertyNG,
  findStateNG,
  generateNigerianPostcodeForState,
  geocodeAddressNG,
  insertPropertyNG,
  isInNigeria,
  normalizeDistrict,
  reverseGeocodeNG,
} from "../_shared/postcode.ts";

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
        supabase.from("business_wallets").select("balance_ngn").eq("business_user_id", ctx.userId).maybeSingle(),
      ]);
      const summary = {
        referral_balance_ngn: Number(refBal?.balance ?? 0),
        business_wallet_balance_ngn: bizWallet ? Number(bizWallet.balance_ngn ?? 0) : null,
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
