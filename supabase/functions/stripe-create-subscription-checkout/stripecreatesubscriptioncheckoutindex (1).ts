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

    const body = await req.json().catch(() => ({}));
    const planCode = String(body?.plan_code || "");
    const allowedCycles = ["monthly", "quarterly", "biannual", "annual"] as const;
    const cycle = (allowedCycles as readonly string[]).includes(String(body?.billing_cycle))
      ? String(body?.billing_cycle) as typeof allowedCycles[number]
      : "monthly";
    if (!planCode) {
      return new Response(JSON.stringify({ error: "plan_code_required" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: plan } = await admin
      .from("subscription_plans")
      .select("code, name, category, monthly_price_ngn, annual_price_ngn, is_active")
      .eq("code", planCode)
      .maybeSingle();
    if (!plan || !plan.is_active) {
      return new Response(JSON.stringify({ error: "plan_not_found" }), { status: 404, headers: corsHeaders });
    }

    const amountNgn =
      cycle === "annual" ? plan.annual_price_ngn
      : cycle === "biannual" ? Math.round(plan.monthly_price_ngn * 6 * 0.95)
      : cycle === "quarterly" ? Math.round(plan.monthly_price_ngn * 3 * 0.97)
      : plan.monthly_price_ngn;
    if (!amountNgn || amountNgn < 100) {
      return new Response(JSON.stringify({ error: "invalid_plan_amount" }), { status: 400, headers: corsHeaders });
    }

    // NGN -> USD conversion (Stripe doesn't support recurring NGN charges on most accounts).
    const rate = Number(Deno.env.get("NGN_USD_RATE") || "1500");
    const amountUsdCents = Math.max(50, Math.ceil((amountNgn / rate) * 100));

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

    const origin = req.headers.get("origin") || "https://loca8tor.com";

    // If the user has already consumed part of a previous 7-day trial (e.g. on
    // Standard) and is now switching plans, honour the remaining days instead
    // of granting another full 7-day trial.
    const { data: riderRow } = await admin
      .from("riders")
      .select("trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();
    const priorEndIso = (riderRow as any)?.trial_ends_at as string | null | undefined;
    let trialDays: number | undefined = 7;
    // Solo rider / driver plans have no free trial — billed immediately.
    if ((plan as any).category === "rider") {
      trialDays = undefined;
    } else if (priorEndIso) {
      const priorEnd = new Date(priorEndIso).getTime();
      const remainingMs = priorEnd - Date.now();
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      trialDays = remainingDays > 0 ? Math.min(7, remainingDays) : undefined;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email || undefined,
      payment_method_types: ["card"], // card includes Apple Pay & Google Pay automatically
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountUsdCents,
          recurring: cycle === "annual"
            ? { interval: "year" as const }
            : { interval: "month" as const, interval_count: cycle === "biannual" ? 6 : cycle === "quarterly" ? 3 : 1 },
          product_data: {
            name: `${plan.name} (${cycle})`,
            description: `Loca8tor ${plan.name} subscription — equivalent of ₦${Number(amountNgn).toLocaleString()} / ${cycle}`,
          },
        },
      }],
      allow_promotion_codes: true,
      success_url: `${origin}/billing?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?stripe=cancel`,
      metadata: {
        user_id: user.id,
        plan_code: planCode,
        billing_cycle: cycle,
        amount_ngn: String(amountNgn),
      },
      subscription_data: {
        ...(trialDays ? { trial_period_days: trialDays } : {}),
        metadata: {
          user_id: user.id,
          plan_code: planCode,
          billing_cycle: cycle,
          amount_ngn: String(amountNgn),
        },
      },
    });

    // Record pending payment row (reuse subscription_payments / paga_reference column).
    await admin.from("subscription_payments").insert({
      user_id: user.id,
      plan_code: planCode,
      billing_cycle: cycle,
      amount_ngn: amountNgn,
      paga_reference: session.id,
      checkout_url: session.url,
      status: "pending",
      raw_request: { provider: "stripe", amount_usd_cents: amountUsdCents, rate },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id, amount_ngn: amountNgn, amount_usd_cents: amountUsdCents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("stripe-create-subscription-checkout", e?.message ?? e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});