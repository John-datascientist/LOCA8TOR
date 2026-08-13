// Returns a fresh 1-year signed URL for a delivery proof photo,
// but only after verifying the caller is allowed to view it.
//
// Access is granted if ONE of the following is true:
//   1. The caller is authenticated AND owns the delivery (business_user_id)
//      or is the assigned rider (linked_rider_id on business_riders).
//   2. The caller supplies the correct `share_code` for that delivery
//      (used by anonymous customers on public tracking pages).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const KNOWN_BUCKETS = new Set(["delivery-proofs", "delivery-photos"]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Parse a stored proof URL (signed or public) into bucket + object path. */
function parseStoragePath(
  input: string,
): { bucket: string; path: string } | null {
  // Already a "bucket/path" pair
  if (!input.startsWith("http")) {
    const slash = input.indexOf("/");
    if (slash === -1) return null;
    return { bucket: input.slice(0, slash), path: input.slice(slash + 1) };
  }
  try {
    const u = new URL(input);
    // Matches /storage/v1/object/{public|sign}/{bucket}/{path...}
    const m = u.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/,
    );
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2].split("?")[0]) };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  let body: { delivery_id?: string; share_code?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const { delivery_id, share_code } = body;
  if (!delivery_id) return json(400, { error: "delivery_id_required" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Load the delivery with the stored proof URL
  const { data: delivery, error: dErr } = await admin
    .from("delivery_trackings")
    .select(
      "id, share_code, proof_photo_url, business_user_id, business_rider_id",
    )
    .eq("id", delivery_id)
    .maybeSingle();

  if (dErr) return json(500, { error: "lookup_failed" });
  if (!delivery) return json(404, { error: "delivery_not_found" });
  if (!delivery.proof_photo_url) return json(404, { error: "no_proof_photo" });

  // ── Permission check ──
  let allowed = false;

  // 1. Anonymous viewer with the correct share code
  if (
    share_code &&
    delivery.share_code &&
    share_code.trim().toUpperCase() === delivery.share_code.toUpperCase()
  ) {
    allowed = true;
  }

  // 2. Authenticated owner / assigned rider
  if (!allowed) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await userClient.auth.getUser();
      const userId = userRes?.user?.id;
      if (userId) {
        // Owner of the business that owns this delivery
        const { data: ownerRow } = await admin
          .from("riders")
          .select("id")
          .eq("user_id", userId)
          .eq("id", delivery.business_user_id)
          .maybeSingle();
        if (ownerRow) allowed = true;

        // Assigned rider (linked_rider_id on business_riders → riders.user_id)
        if (!allowed && delivery.business_rider_id) {
          const { data: bRider } = await admin
            .from("business_riders")
            .select("linked_rider_id")
            .eq("id", delivery.business_rider_id)
            .maybeSingle();
          if (bRider?.linked_rider_id) {
            const { data: linked } = await admin
              .from("riders")
              .select("id")
              .eq("id", bRider.linked_rider_id)
              .eq("user_id", userId)
              .maybeSingle();
            if (linked) allowed = true;
          }
        }
      }
    }
  }

  if (!allowed) return json(403, { error: "forbidden" });

  // ── Issue a fresh signed URL ──
  const parsed = parseStoragePath(delivery.proof_photo_url);
  if (!parsed || !KNOWN_BUCKETS.has(parsed.bucket)) {
    return json(400, { error: "unrecognized_storage_path" });
  }

  const { data: signed, error: sErr } = await admin.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, ONE_YEAR_SECONDS);

  if (sErr || !signed) return json(500, { error: "sign_failed" });

  return json(200, {
    url: signed.signedUrl,
    expires_in: ONE_YEAR_SECONDS,
  });
});
