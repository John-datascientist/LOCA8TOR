import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Called by the user after they've made the bank transfer on their bank app.
// This is what actually creates the pending_bank_transfers row + mirrored wallet_transactions.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    // Any signed-in account (business or rider/driver) can fund their wallet.

    const body = await req.json().catch(() => ({}));
    const reference = String(body?.reference || "").trim();
    const walletCredit = Number(body?.wallet_credit_ngn || 0);
    const pagaFee = Number(body?.paga_fee_ngn || 0);
    const amountTotal = Number(body?.amount_ngn || walletCredit + pagaFee);
    const senderName = body?.sender_name ? String(body.sender_name).slice(0, 200) : null;
    const senderNote = body?.sender_note ? String(body.sender_note).slice(0, 500) : null;

    if (!reference || !Number.isFinite(walletCredit) || walletCredit < 100) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: corsHeaders });
    }

    // Reuse an existing pending row for the same reference if one already exists (idempotent).
    const { data: existing } = await admin
      .from("pending_bank_transfers")
      .select("*")
      .eq("user_id", user.id)
      .eq("reference_code", reference)
      .eq("status", "pending")
      .maybeSingle();

    const noteParts: string[] = [];
    if (senderName) noteParts.push(`Sender: ${senderName}`);
    if (senderNote) noteParts.push(senderNote);
    noteParts.push(`User confirmed at ${new Date().toISOString()}`);
    const adminNote = noteParts.join(" | ");

    let row = existing;
    if (!row) {
      const { data: inserted, error: insertErr } = await admin
        .from("pending_bank_transfers")
        .insert({
          user_id: user.id,
          reference_code: reference,
          amount_ngn: amountTotal,
          wallet_credit_ngn: walletCredit,
          paga_fee_ngn: pagaFee,
          status: "pending",
          admin_note: adminNote,
        })
        .select()
        .maybeSingle();
      if (insertErr || !inserted) {
        console.error("paga-confirm-bank-transfer insert failed", insertErr);
        return new Response(JSON.stringify({ error: "could_not_create_transfer" }), { status: 500, headers: corsHeaders });
      }
      row = inserted;

      // Mirror into wallet_transactions for unified history.
      await admin.from("wallet_transactions").insert({
        business_user_id: user.id,
        amount: walletCredit,
        type: "credit",
        status: "pending",
        payment_method: "bank_transfer",
        payment_provider: "paga_manual",
        provider_reference: inserted.id,
        reference_code: reference,
        description: `Bank transfer pending admin confirmation (₦${walletCredit.toLocaleString()} + ₦${pagaFee} fee)`,
      });
    } else {
      await admin.from("pending_bank_transfers").update({ admin_note: adminNote }).eq("id", row.id);
    }

    return new Response(JSON.stringify({ ok: true, transfer: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("paga-confirm-bank-transfer", e?.message ?? e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders });
  }
});