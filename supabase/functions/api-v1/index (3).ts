// Loca8tor public developer REST API (v1).
//
// Authenticated with per-business API keys (public.api_keys), NOT Supabase
// session JWTs — this is the resource external developers integrate
// against, separate from the app's own Supabase Auth. Every request is
// billed against the caller's active API subscription
// (public.api_subscriptions, category='api' plans from
// public.subscription_plans) using the same wallet-billing architecture
// the fleet product already uses — see supabase/migrations/*_developer_api.sql.
//
// Routing is done here by pathname suffix after the function's own mount
// point; the public path is served at https://loca8tor.com/api/v1/* via a
// Vercel rewrite to this function (see vercel.json), so paths inside this
// file are relative to that — e.g. this file's "/postcode" is the public
// "/api/v1/postcode".
import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import { isInNigeria, resolvePostcodeForCoords } from "../_shared/postcode.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

const BATCH_MAX = 100;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...CORS_HEADERS, ...extraHeaders } });
}

function errorResponse(code: string, message: string, status: number) {
  return json({ error: code, message }, status);
}

// ---------------------------------------------------------------------------
// Straight-line distance — same haversine formula as src/lib/vehicleSpeed.ts
// (haversineKm), ported so the API's numbers match what the app itself shows.
// ---------------------------------------------------------------------------
function haversineKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ---------------------------------------------------------------------------
// Route request — same two-endpoint OSRM fetch-with-fallback as
// src/components/map/useRoute.ts, ported for server-side use.
// ---------------------------------------------------------------------------
const TURN_TEXT: Record<string, string> = {
  uturn: "Make a U-turn",
  "sharp right": "Turn sharp right",
  right: "Turn right",
  "slight right": "Turn slightly right",
  straight: "Continue straight",
  "slight left": "Turn slightly left",
  left: "Turn left",
  "sharp left": "Turn sharp left",
};

// deno-lint-ignore no-explicit-any
function describeStep(step: any): string {
  const maneuver = step.maneuver || {};
  const type = maneuver.type as string;
  const modifier = maneuver.modifier as string | undefined;
  const name = step.name as string | undefined;
  const onward = name ? ` onto ${name}` : "";
  switch (type) {
    case "depart":
      return `Head out${onward}`;
    case "arrive":
      return modifier ? `Arrive at your destination, on the ${modifier}` : "Arrive at your destination";
    case "roundabout":
    case "rotary":
    case "roundabout turn": {
      const exit = maneuver.exit ? ` and take exit ${maneuver.exit}` : "";
      return `Enter the roundabout${exit}`;
    }
    case "merge":
      return `Merge${onward}`;
    case "on ramp":
      return `Take the ramp${onward}`;
    case "off ramp":
      return `Take the exit${onward}`;
    case "fork":
      return modifier ? `Keep ${modifier}${onward}` : `Continue${onward}`;
    case "end of road":
      return modifier ? `${TURN_TEXT[modifier] || "Turn"} at the end of the road${onward}` : `Continue${onward}`;
    case "new name":
      return `Continue${onward}`;
    case "turn":
    default:
      return `${(modifier && TURN_TEXT[modifier]) || "Continue"}${onward}`;
  }
}

async function fetchRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const endpoints = [
    `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`,
  ];
  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.routes?.[0]) {
        const r = data.routes[0];
        // deno-lint-ignore no-explicit-any
        const steps = (r.legs || []).flatMap((leg: any) =>
          (leg.steps || []).map((s: any) => ({
            instruction: describeStep(s),
            distanceM: s.distance,
            durationS: s.duration,
            maneuverType: s.maneuver?.type,
            maneuverModifier: s.maneuver?.modifier,
            location: [s.maneuver.location[1], s.maneuver.location[0]],
            streetName: s.name || undefined,
          })),
        );
        return {
          coordinates: r.geometry.coordinates.map((c: number[]) => [c[1], c[0]]),
          distanceKm: Math.round(r.distance / 100) / 10,
          durationMin: Math.round(r.duration / 60),
          isFallback: false,
          steps,
        };
      }
    } catch {
      // try next endpoint
    }
  }
  return {
    coordinates: [[from.lat, from.lng], [to.lat, to.lng]],
    distanceKm: haversineKm(from, to),
    durationMin: 0,
    isFallback: true,
    steps: [],
  };
}

// ---------------------------------------------------------------------------
// Auth + quota
// ---------------------------------------------------------------------------
type AuthedRequest = {
  apiKeyId: string;
  businessUserId: string;
  environment: string;
};

function parseCoord(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const DELIVERY_STATUSES = ["pending", "accepted", "picked_up", "on_my_way_deliver", "delivered", "failed"];

// deno-lint-ignore no-explicit-any
async function resolveBusiness(admin: any, businessUserId: string): Promise<{ id: string } | null> {
  const { data } = await admin
    .from("riders")
    .select("id")
    .eq("user_id", businessUserId)
    .eq("account_type", "business")
    .maybeSingle();
  return data ?? null;
}

function newShareCode(): string {
  return `TRK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// deno-lint-ignore no-explicit-any
function deliveryResponse(row: any) {
  return {
    id: row.id,
    shareCode: row.share_code,
    trackingUrl: `https://loca8tor.com/track/${row.share_code}`,
    status: row.status,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    fromPostcode: row.from_postcode,
    toPostcode: row.to_postcode,
    riderId: row.business_rider_id,
    riderName: row.rider_name,
    riderPhone: row.rider_phone,
    deliveryFee: row.delivery_fee,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deliveredAt: row.delivered_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  // Strip the function's own mount prefix so routing below matches the
  // public /api/v1/* path exactly regardless of how it's invoked.
  const path = url.pathname.replace(/^\/api-v1/, "") || "/";

  const authHeader = req.headers.get("authorization") ?? "";
  const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!rawKey) {
    return errorResponse("unauthorized", "Missing Authorization: Bearer <API key> header.", 401);
  }

  const { data: verify, error: verifyError } = await admin.rpc("verify_api_key", { _raw_key: rawKey });
  if (verifyError || !verify?.valid) {
    return errorResponse("unauthorized", "Invalid or revoked API key.", 401);
  }
  const auth: AuthedRequest = {
    apiKeyId: verify.api_key_id,
    businessUserId: verify.business_user_id,
    environment: verify.environment,
  };

  const { data: quota, error: quotaError } = await admin.rpc("check_api_quota", {
    _business_user_id: auth.businessUserId,
  });
  if (quotaError) {
    return errorResponse("internal_error", "Could not verify plan quota.", 500);
  }
  if (!quota?.allowed) {
    const status = quota?.error === "no_active_api_plan" || quota?.error === "subscription_past_due" ? 403 : 429;
    return errorResponse(
      quota?.error === "no_active_api_plan"
        ? "no_active_plan"
        : quota?.error === "subscription_past_due"
        ? "subscription_past_due"
        : "quota_exceeded",
      quota?.error === "no_active_api_plan"
        ? "No active API plan. Subscribe at https://loca8tor.com/api."
        : quota?.error === "subscription_past_due"
        ? "Your API subscription is past due. Fund your wallet to resume."
        : `Monthly quota of ${quota?.calls_limit} calls reached.`,
      status,
    );
  }

  // Handled below; recorded once we know the real outcome (billable = 2xx).
  let status = 200;
  let responseBody: unknown;

  try {
    if (req.method === "GET" && path === "/postcode") {
      const lat = parseCoord(url.searchParams.get("lat"));
      const lng = parseCoord(url.searchParams.get("lng"));
      if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        status = 400;
        responseBody = { error: "invalid_params", message: "lat and lng are required, valid decimal degrees." };
      } else if (!isInNigeria(lat, lng)) {
        status = 422;
        responseBody = { error: "unsupported_location", message: "Coordinates are outside Nigeria — the only country currently supported." };
      } else {
        const resolved = await resolvePostcodeForCoords(admin, lat, lng);
        status = 200;
        responseBody = {
          postcode: resolved.postcode,
          state: resolved.state,
          country: "Nigeria",
          lga: resolved.lga || null,
          lat,
          lng,
          address: resolved.address,
        };
      }
    } else if (req.method === "GET" && path === "/lookup") {
      const code = (url.searchParams.get("code") || "").trim().toUpperCase();
      if (!code) {
        status = 400;
        responseBody = { error: "invalid_params", message: "code is required." };
      } else {
        const { data, error } = await admin
          .from("properties")
          .select("postcode, lat, lng, state_name, lga_name, address")
          .eq("postcode", code)
          .maybeSingle();
        if (error || !data) {
          status = 404;
          responseBody = { error: "not_found", message: `No location found for postcode ${code}.` };
        } else {
          status = 200;
          responseBody = {
            postcode: data.postcode,
            lat: data.lat,
            lng: data.lng,
            state: data.state_name,
            lga: data.lga_name,
            country: "Nigeria",
            address: data.address,
          };
        }
      }
    } else if (req.method === "POST" && path === "/batch") {
      const body = await req.json().catch(() => ({}));
      const locations = Array.isArray(body?.locations) ? body.locations : null;
      if (!locations || locations.length === 0) {
        status = 400;
        responseBody = { error: "invalid_params", message: "locations must be a non-empty array of {lat, lng}." };
      } else if (locations.length > BATCH_MAX) {
        status = 400;
        responseBody = { error: "batch_too_large", message: `Maximum ${BATCH_MAX} locations per batch request.` };
      } else {
        const results = await Promise.all(
          locations.map(async (loc: { lat?: number; lng?: number }) => {
            const lat = typeof loc.lat === "number" ? loc.lat : null;
            const lng = typeof loc.lng === "number" ? loc.lng : null;
            if (lat === null || lng === null || !isInNigeria(lat, lng)) {
              return { lat, lng, error: "invalid_or_unsupported_location" };
            }
            const resolved = await resolvePostcodeForCoords(admin, lat, lng);
            return { postcode: resolved.postcode, state: resolved.state, lat, lng };
          }),
        );
        status = 200;
        responseBody = { results, count: results.length };
      }
    } else if (req.method === "GET" && path === "/distance") {
      const fromLat = parseCoord(url.searchParams.get("fromLat"));
      const fromLng = parseCoord(url.searchParams.get("fromLng"));
      const toLat = parseCoord(url.searchParams.get("toLat"));
      const toLng = parseCoord(url.searchParams.get("toLng"));
      if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
        status = 400;
        responseBody = { error: "invalid_params", message: "fromLat, fromLng, toLat, toLng are all required." };
      } else {
        const distanceKm = haversineKm({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng });
        status = 200;
        responseBody = { distanceKm, distanceM: Math.round(distanceKm * 1000), unit: "straight-line" };
      }
    } else if (req.method === "GET" && path === "/route") {
      const fromLat = parseCoord(url.searchParams.get("fromLat"));
      const fromLng = parseCoord(url.searchParams.get("fromLng"));
      const toLat = parseCoord(url.searchParams.get("toLat"));
      const toLng = parseCoord(url.searchParams.get("toLng"));
      if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
        status = 400;
        responseBody = { error: "invalid_params", message: "fromLat, fromLng, toLat, toLng are all required." };
      } else {
        const route = await fetchRoute({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng });
        status = 200;
        responseBody = route;
      }
    } else if (req.method === "GET" && path === "/search") {
      const query = (url.searchParams.get("query") || "").trim();
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
      if (!query || query.length < 2) {
        status = 400;
        responseBody = { error: "invalid_params", message: "query must be at least 2 characters." };
      } else {
        const term = query.replace(/[%_]/g, "");
        const { data, error } = await admin
          .from("properties")
          .select("postcode, lat, lng, state_name, lga_name, address")
          .or(`postcode.ilike.%${term}%,address.ilike.%${term}%,state_name.ilike.%${term}%,lga_name.ilike.%${term}%`)
          .limit(limit);
        if (error) {
          status = 500;
          responseBody = { error: "internal_error", message: "Search failed." };
        } else {
          status = 200;
          responseBody = { results: data ?? [], count: (data ?? []).length };
        }
      }
    } else if (req.method === "GET" && path === "/fleet/riders") {
      const bizRow = await resolveBusiness(admin, auth.businessUserId);
      if (!bizRow) {
        status = 403;
        responseBody = { error: "not_a_business_account", message: "This API key's account is not a Loca8tor business account." };
      } else {
        const { data, error } = await admin
          .from("business_riders")
          .select("id, rider_name, status, rider_live_status, vehicle_type, last_lat, last_lng, last_postcode, last_seen")
          .eq("business_user_id", bizRow.id)
          .order("rider_name");
        if (error) {
          status = 500;
          responseBody = { error: "internal_error", message: "Could not load fleet riders." };
        } else {
          status = 200;
          responseBody = { riders: data ?? [], count: (data ?? []).length };
        }
      }
    } else if (req.method === "GET" && /^\/fleet\/riders\/[^/]+\/location$/.test(path)) {
      const riderId = path.split("/")[3];
      const bizRow = await resolveBusiness(admin, auth.businessUserId);
      if (!bizRow) {
        status = 403;
        responseBody = { error: "not_a_business_account", message: "This API key's account is not a Loca8tor business account." };
      } else {
        const { data, error } = await admin
          .from("business_riders")
          .select("id, rider_name, rider_live_status, last_lat, last_lng, last_postcode, last_seen, location_sharing")
          .eq("id", riderId)
          .eq("business_user_id", bizRow.id)
          .maybeSingle();
        if (error || !data) {
          status = 404;
          responseBody = { error: "not_found", message: "No rider with that id in this fleet." };
        } else if (!data.location_sharing) {
          status = 403;
          responseBody = { error: "location_not_shared", message: "This rider has not enabled location sharing." };
        } else {
          status = 200;
          responseBody = {
            riderId: data.id,
            riderName: data.rider_name,
            status: data.rider_live_status,
            lat: data.last_lat,
            lng: data.last_lng,
            postcode: data.last_postcode,
            lastSeen: data.last_seen,
          };
        }
      }
    } else if (req.method === "POST" && path === "/deliveries") {
      const bizRow = await resolveBusiness(admin, auth.businessUserId);
      if (!bizRow) {
        status = 403;
        responseBody = { error: "not_a_business_account", message: "This API key's account is not a Loca8tor business account." };
      } else {
        const body = await req.json().catch(() => ({}));
        const customerName = String(body?.customerName || "").trim();
        if (!customerName) {
          status = 400;
          responseBody = { error: "invalid_params", message: "customerName is required." };
        } else {
          let riderId: string | null = null;
          if (body?.riderId) {
            const { data: riderRow } = await admin
              .from("business_riders")
              .select("id")
              .eq("id", body.riderId)
              .eq("business_user_id", bizRow.id)
              .maybeSingle();
            if (!riderRow) {
              status = 400;
              responseBody = { error: "invalid_rider", message: "riderId does not belong to this fleet." };
            } else {
              riderId = riderRow.id;
            }
          }
          if (status !== 400) {
            const { data, error } = await admin
              .from("delivery_trackings")
              .insert({
                business_user_id: bizRow.id,
                business_rider_id: riderId,
                share_code: newShareCode(),
                customer_name: customerName,
                customer_phone: body?.customerPhone || null,
                from_postcode: body?.fromPostcode || null,
                to_postcode: body?.toPostcode || null,
                pickup_lat: typeof body?.pickupLat === "number" ? body.pickupLat : null,
                pickup_lng: typeof body?.pickupLng === "number" ? body.pickupLng : null,
                dropoff_lat: typeof body?.dropoffLat === "number" ? body.dropoffLat : null,
                dropoff_lng: typeof body?.dropoffLng === "number" ? body.dropoffLng : null,
                delivery_fee: typeof body?.deliveryFee === "number" ? body.deliveryFee : null,
                notes: body?.notes || null,
                status: "pending",
              } as Record<string, unknown>)
              .select()
              .maybeSingle();
            if (error || !data) {
              status = 500;
              responseBody = { error: "internal_error", message: error?.message || "Could not create delivery." };
            } else {
              status = 201;
              responseBody = deliveryResponse(data);
            }
          }
        }
      }
    } else if (req.method === "GET" && path === "/deliveries") {
      const bizRow = await resolveBusiness(admin, auth.businessUserId);
      if (!bizRow) {
        status = 403;
        responseBody = { error: "not_a_business_account", message: "This API key's account is not a Loca8tor business account." };
      } else {
        const statusFilter = url.searchParams.get("status");
        const riderFilter = url.searchParams.get("riderId");
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
        let q = admin.from("delivery_trackings").select("*").eq("business_user_id", bizRow.id)
          .order("created_at", { ascending: false }).limit(limit);
        if (statusFilter) q = q.eq("status", statusFilter);
        if (riderFilter) q = q.eq("business_rider_id", riderFilter);
        const { data, error } = await q;
        if (error) {
          status = 500;
          responseBody = { error: "internal_error", message: "Could not load deliveries." };
        } else {
          status = 200;
          responseBody = { deliveries: (data ?? []).map(deliveryResponse), count: (data ?? []).length };
        }
      }
    } else if (req.method === "GET" && /^\/deliveries\/[^/]+$/.test(path)) {
      const bizRow = await resolveBusiness(admin, auth.businessUserId);
      if (!bizRow) {
        status = 403;
        responseBody = { error: "not_a_business_account", message: "This API key's account is not a Loca8tor business account." };
      } else {
        const deliveryId = path.split("/")[2];
        const { data, error } = await admin.from("delivery_trackings").select("*")
          .eq("id", deliveryId).eq("business_user_id", bizRow.id).maybeSingle();
        if (error || !data) {
          status = 404;
          responseBody = { error: "not_found", message: "No delivery with that id." };
        } else {
          status = 200;
          responseBody = deliveryResponse(data);
        }
      }
    } else if (req.method === "PATCH" && /^\/deliveries\/[^/]+\/status$/.test(path)) {
      const bizRow = await resolveBusiness(admin, auth.businessUserId);
      if (!bizRow) {
        status = 403;
        responseBody = { error: "not_a_business_account", message: "This API key's account is not a Loca8tor business account." };
      } else {
        const deliveryId = path.split("/")[2];
        const body = await req.json().catch(() => ({}));
        const newStatus = String(body?.status || "");
        if (!DELIVERY_STATUSES.includes(newStatus)) {
          status = 400;
          responseBody = { error: "invalid_params", message: `status must be one of: ${DELIVERY_STATUSES.join(", ")}.` };
        } else {
          const updatePayload: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
          if (newStatus === "delivered") updatePayload.delivered_at = new Date().toISOString();
          const { data, error } = await admin.from("delivery_trackings").update(updatePayload)
            .eq("id", deliveryId).eq("business_user_id", bizRow.id).select().maybeSingle();
          if (error || !data) {
            status = 404;
            responseBody = { error: "not_found", message: "No delivery with that id." };
          } else {
            // Mirror the app's own counters so business analytics/success rate stay accurate.
            if ((newStatus === "delivered" || newStatus === "failed") && data.business_rider_id) {
              const { data: brRow } = await admin.from("business_riders")
                .select("total_deliveries, successful_deliveries, failed_deliveries")
                .eq("id", data.business_rider_id).maybeSingle();
              if (brRow) {
                const counterUpdates = newStatus === "delivered"
                  ? { successful_deliveries: (brRow.successful_deliveries || 0) + 1, total_deliveries: (brRow.total_deliveries || 0) + 1 }
                  : { failed_deliveries: (brRow.failed_deliveries || 0) + 1, total_deliveries: (brRow.total_deliveries || 0) + 1 };
                await admin.from("business_riders").update(counterUpdates).eq("id", data.business_rider_id);
              }
            }
            status = 200;
            responseBody = deliveryResponse(data);
          }
        }
      }
    } else if (req.method === "POST" && /^\/deliveries\/[^/]+\/assign$/.test(path)) {
      const bizRow = await resolveBusiness(admin, auth.businessUserId);
      if (!bizRow) {
        status = 403;
        responseBody = { error: "not_a_business_account", message: "This API key's account is not a Loca8tor business account." };
      } else {
        const deliveryId = path.split("/")[2];
        const body = await req.json().catch(() => ({}));
        const riderId = String(body?.riderId || "");
        if (!riderId) {
          status = 400;
          responseBody = { error: "invalid_params", message: "riderId is required." };
        } else {
          const { data: riderRow } = await admin.from("business_riders")
            .select("id, rider_name, rider_phone")
            .eq("id", riderId).eq("business_user_id", bizRow.id).maybeSingle();
          if (!riderRow) {
            status = 400;
            responseBody = { error: "invalid_rider", message: "riderId does not belong to this fleet." };
          } else {
            const { data, error } = await admin.from("delivery_trackings").update({
              business_rider_id: riderRow.id,
              rider_name: riderRow.rider_name,
              rider_phone: riderRow.rider_phone,
            }).eq("id", deliveryId).eq("business_user_id", bizRow.id).select().maybeSingle();
            if (error || !data) {
              status = 404;
              responseBody = { error: "not_found", message: "No delivery with that id." };
            } else {
              status = 200;
              responseBody = deliveryResponse(data);
            }
          }
        }
      }
    } else {
      status = 404;
      responseBody = { error: "not_found", message: `No endpoint at ${req.method} ${path}.` };
    }
  } catch (e) {
    status = 500;
    responseBody = { error: "internal_error", message: (e as Error).message };
  }

  const billable = status < 400;
  await admin.rpc("record_api_usage", {
    _api_key_id: auth.apiKeyId,
    _business_user_id: auth.businessUserId,
    _endpoint: path,
    _method: req.method,
    _status_code: status,
    _billable: billable,
  });

  return json(responseBody, status, {
    "X-RateLimit-Limit": String(quota.calls_limit),
    "X-RateLimit-Remaining": String(Math.max(0, quota.calls_limit - quota.calls_used - (billable ? 1 : 0))),
  });
});
