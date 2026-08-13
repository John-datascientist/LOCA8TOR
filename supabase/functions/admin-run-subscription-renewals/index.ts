import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: sa } = await admin.from("super_admins").select("email")
      .eq("email", (user.email || "").toLowerCase()).maybeSingle();
    if (!sa) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const fromISO = body?.from ? String(body.from) : null;
    const toISO = body?.to ? String(body.to) : new Date().toISOString();
    const businessUserId = body?.business_user_id ? String(body.business_user_id) : null;

    let q = admin.from("business_subscriptions")
      .select("id, business_user_id, plan_code, next_renewal_at")
      .eq("auto_renew", true)
      .in("status", ["active", "past_due", "trialing"])
      .lte("next_renewal_at", toISO);
    if (fromISO) q = q.gte("next_renewal_at", fromISO);
    if (businessUserId) q = q.eq("business_user_id", businessUserId);

    const { data: dueSubs, error: qErr } = await q;
    if (qErr) return new Response(JSON.stringify({ error: qErr.message }), { status: 400, headers: corsHeaders });

    const results: any[] = [];
    for (const s of (dueSubs || [])) {
      const { data, error } = await admin.rpc("process_subscription_renewal", { _subscription_id: s.id });
      results.push({
        subscription_id: s.id,
        business_user_id: s.business_user_id,
        plan_code: s.plan_code,
        result: data,
        error: error?.message ?? null,
      });
    }

    await admin.from("admin_audit_log").insert({
      admin_email: user.email,
      action: "manual_run_subscription_renewals",
      target_type: "business_subscriptions",
      details: { from: fromISO, to: toISO, business_user_id: businessUserId, count: results.length },
    }).then(() => null, () => null);

    return new Response(JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders });
  }
});