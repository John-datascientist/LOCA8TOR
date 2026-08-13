import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Static company Paga account — users transfer here and quote their reference code.
const PAGA_ACCOUNT = {
  bankName: "Paga",
  accountNumber: "1174833267",
  accountName: "Workerholics Solutions Limited",
};

// Deterministic, per-user static reference code. Same user → same code every time.
async function makeReferenceCode(userId: string): Promise<string> {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId)));
  const first = Array.from(bytes.slice(0, 4)).map((b) => alphabet[b % alphabet.length]).join("");
  const second = Array.from(bytes.slice(4, 9)).map((b) => alphabet[b % alphabet.length]).join("");
  return `LCT-${first}-${second}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    // Any signed-in account (business or rider/driver) can fund their wallet.

    const body = await req.json().catch(() => ({}));
    const orderAmount = Number(body?.amount_ngn || 0);
    if (!Number.isFinite(orderAmount) || orderAmount < 100 || orderAmount > 10_000_000) {
      return new Response(
        JSON.stringify({ error: "invalid_amount", message: "Amount must be between ₦100 and ₦10,000,000." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Paga transfer fee: 0.75% capped at ₦1,000 — payer covers it on top of the wallet credit.
    const pagaFee = Math.min(Math.ceil(orderAmount * 0.0075), 1000);
    const totalTransfer = orderAmount + pagaFee;

    // Static per-user reference code (same code for every transfer this user ever makes).
    // Note: we do NOT create the pending_bank_transfers row here. It is created only
    // once the user confirms they have made the transfer (via paga-confirm-bank-transfer),
    // so that abandoned funding requests don't clutter the user dashboard or admin queue.
    const reference = await makeReferenceCode(user.id);
    // Suppress unused var linters
    void supabase;

    return new Response(
      JSON.stringify({
        reference,
        method_details: PAGA_ACCOUNT,
        wallet_credit: orderAmount,
        paga_fee: pagaFee,
        transfer_amount: totalTransfer,
        manual_confirm: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("paga-fund-wallet exception", String(e?.message ?? e));
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
