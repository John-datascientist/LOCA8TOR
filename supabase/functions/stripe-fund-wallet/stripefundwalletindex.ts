import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
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
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Any signed-in account (business or solo rider/driver) can fund their wallet.

    const body = await req.json().catch(() => ({}));
    const amountNgn = Number(body?.amount_ngn || 0);
    if (!Number.isFinite(amountNgn) || amountNgn < 100 || amountNgn > 10_000_000) {
      return new Response(
        JSON.stringify({ error: "invalid_amount", message: "Amount must be between ₦100 and ₦10,000,000." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "stripe_not_configured" }), { status: 500, headers: corsHeaders });
    }
    // Deno's runtime can't run Stripe's default Node http client (surfaces as
    // "Deno.core.runMicrotasks() is not supported" / connection errors) —
    // must use the fetch-based client instead. maxNetworkRetries: 0 because the
    // SDK's retry-backoff delay itself still hits that same Node timer shim, so
    // a request that needs a retry crashes even with the fetch client set.
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia", httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 0 });

    // NGN -> USD conversion (Stripe doesn't support NGN charges on most accounts).
    const rate = Number(Deno.env.get("NGN_USD_RATE") || "1500");
    const amountUsdCents = Math.max(50, Math.ceil((amountNgn / rate) * 100));

    const origin = req.headers.get("origin") || "https://loca8tor.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email || undefined,
      payment_method_types: ["card"], // card includes Apple Pay & Google Pay automatically
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountUsdCents,
          product_data: {
            name: "Loca8tor wallet top-up",
            description: `Wallet credit — equivalent of ₦${amountNgn.toLocaleString()}`,
          },
        },
      }],
      success_url: `${origin}/wallet?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/wallet?stripe=cancel`,
      metadata: {
        user_id: user.id,
        wallet_topup: "true",
        amount_ngn: String(amountNgn),
      },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id, amount_ngn: amountNgn, amount_usd_cents: amountUsdCents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("stripe-fund-wallet", e?.message ?? e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
