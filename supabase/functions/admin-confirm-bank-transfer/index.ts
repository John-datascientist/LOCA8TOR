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
    const { data: sa } = await admin.from("super_admins").select("email").eq("email", (user.email || "").toLowerCase()).maybeSingle();
    if (!sa) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const transferId = String(body?.transfer_id || "");
    const action = String(body?.action || "");
    const note = body?.note ? String(body.note).slice(0, 500) : null;
    if (!transferId || !["confirm", "reject", "recall"].includes(action)) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: corsHeaders });
    }

    if (action === "confirm") {
      const { data, error } = await admin.rpc("credit_wallet_from_transfer", {
        _transfer_id: transferId,
        _admin_id: user.id,
        _admin_note: note,
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else if (action === "recall") {
      const { data, error } = await admin.rpc("recall_confirmed_transfer", {
        _transfer_id: transferId,
        _admin_id: user.id,
        _admin_note: note,
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      const { data, error } = await admin.rpc("reject_pending_transfer", {
        _transfer_id: transferId,
        _admin_id: user.id,
        _admin_note: note,
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      // Mark only the mirrored wallet_transactions row tied to this specific transfer as failed.
      await admin.from("wallet_transactions").update({
        status: "failed",
        admin_note: note,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      }).eq("provider_reference", transferId);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e: any) {
    console.error("admin-confirm-bank-transfer", e?.message ?? e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders });
  }
});