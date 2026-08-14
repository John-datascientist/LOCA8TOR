import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function addMonths(d: Date, n: number) {
  const x = new Date(d); x.setMonth(x.getMonth() + n); return x;
}
function addYears(d: Date, n: number) {
  const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x;
}

async function sendPaymentFailedEmails(admin: ReturnType<typeof createClient>, params: {
  userId: string;
  outcome: 'wallet_covered' | 'paused';
  amountNgn: number;
  invoiceId: string;
}) {
  try {
    // Look up the business owner.
    const { data: rider } = await admin
      .from('riders')
      .select('full_name, business_name, user_id')
      .eq('user_id', params.userId)
      .maybeSingle();
    let ownerEmail: string | null = null;
    try {
      const { data: u } = await (admin as any).auth.admin.getUserById(params.userId);
      ownerEmail = u?.user?.email ?? null;
    } catch (_) {}

    const businessName = (rider as any)?.business_name || 'your business';
    const ownerName = (rider as any)?.full_name || undefined;

    if (ownerEmail) {
      await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'payment-failed',
          recipientEmail: ownerEmail,
          idempotencyKey: `pay-failed-owner-${params.invoiceId}-${params.outcome}`,
          templateData: {
            name: ownerName,
            businessName,
            amountNgn: params.amountNgn,
            outcome: params.outcome,
            isAdmin: false,
          },
        },
      });
    }

    // Notify internal admin staff.
    const { data: staff } = await admin
      .from('admin_staff')
      .select('email, full_name')
      .not('email', 'is', null);
    for (const s of (staff as any[]) || []) {
      if (!s?.email) continue;
      await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'payment-failed',
          recipientEmail: s.email,
          idempotencyKey: `pay-failed-admin-${params.invoiceId}-${params.outcome}-${s.email}`,
          templateData: {
            name: s.full_name || 'Admin',
            businessName,
            amountNgn: params.amountNgn,
            outcome: params.outcome,
            isAdmin: true,
          },
        },
      });
    }
  } catch (e: any) {
    console.error('sendPaymentFailedEmails error', e?.message ?? e);
  }
}

async function activateSubscription(admin: ReturnType<typeof createClient>, params: {
  userId: string; planCode: string; cycle: "monthly" | "annual"; periodStart?: Date; periodEnd?: Date; trialEnd?: Date | null; status?: string;
}) {
  const now = params.periodStart ?? new Date();
  const end = params.periodEnd ?? (params.cycle === "annual" ? addYears(now, 1) : addMonths(now, 1));
  const dbStatus = params.status ?? 'active';
  const trialIso = params.trialEnd ? params.trialEnd.toISOString() : null;

  // Cancel any other active sub for this user (unique partial index allows only one active).
  await admin
    .from("business_subscriptions")
    .update({ status: "cancelled" })
    .eq("business_user_id", params.userId)
    .in("status", ["active", "past_due"])
    .neq("plan_code", params.planCode);

  // Upsert
  const { data: existing } = await admin
    .from("business_subscriptions")
    .select("id")
    .eq("business_user_id", params.userId)
    .eq("plan_code", params.planCode)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("business_subscriptions").update({
      billing_cycle: params.cycle,
      status: dbStatus,
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      next_renewal_at: end.toISOString(),
      trial_ends_at: trialIso,
      auto_renew: true,
    }).eq("id", existing.id);
  } else {
    await admin.from("business_subscriptions").insert({
      business_user_id: params.userId,
      plan_code: params.planCode,
      billing_cycle: params.cycle,
      status: dbStatus,
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      next_renewal_at: end.toISOString(),
      trial_ends_at: trialIso,
      auto_renew: true,
    });

  }

  // Sync riders table so get_effective_subscription_status reflects the active plan
  await admin.from("riders").update({ subscription_status: "active" }).eq("user_id", params.userId);
  await admin.rpc("check_rider_referral_qualification", { _referred_user_id: params.userId }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !whSecret) {
    return new Response("stripe_not_configured", { status: 500, headers: corsHeaders });
  }
  // Deno's runtime can't run Stripe's default Node http client (surfaces as
  // "Deno.core.runMicrotasks() is not supported" / connection errors) —
  // must use the fetch-based client instead.
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia", httpClient: Stripe.createFetchHttpClient() });
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig || "", whSecret);
  } catch (e: any) {
    console.error("stripe-webhook signature error", e?.message ?? e);
    return new Response(`bad signature: ${e?.message}`, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = (session.metadata || {}) as Record<string, string>;
      const userId = meta.user_id;
      const planCode = meta.plan_code;
      const cycle = (meta.billing_cycle === "annual" ? "annual" : "monthly") as "monthly" | "annual";

      if (userId && meta.wallet_topup === "true") {
        // One-time wallet top-up via card (stripe-fund-wallet) — not a
        // subscription, so it's handled separately from the plan_code branch
        // below. Uses credit_wallet_open (not credit_wallet) because that
        // RPC only allows account_type = 'business'; wallet top-ups are open
        // to solo riders/drivers too, same as the manual bank-transfer path.
        const amountNgn = Number(meta.amount_ngn || 0);
        if (amountNgn > 0) {
          const { error: creditErr } = await admin.rpc("credit_wallet_open", {
            _user_id: userId,
            _amount: amountNgn,
            _provider_reference: session.id,
            _method: "card",
            _provider: "stripe",
            _description: "Wallet top-up via card (Stripe)",
          });
          if (creditErr) console.error("credit_wallet_open failed", creditErr.message);
        }
      } else if (userId && planCode) {
        // Fetch the Stripe subscription so we honour the 7-day trial period
        // set at checkout creation. Without this the row is written as an
        // immediately-active 1-month sub, overwriting the trialing state.
        let periodStart: Date | undefined;
        let periodEnd: Date | undefined;
        let trialEnd: Date | null = null;
        let dbStatus = 'active';
        if (typeof session.subscription === 'string') {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            if (sub.current_period_start) periodStart = new Date(sub.current_period_start * 1000);
            if (sub.current_period_end) periodEnd = new Date(sub.current_period_end * 1000);
            if (sub.trial_end) trialEnd = new Date(sub.trial_end * 1000);
            dbStatus = sub.status === 'trialing' ? 'trialing' : (sub.status === 'active' ? 'active' : dbStatus);
          } catch (e: any) {
            console.error('checkout.session.completed sub retrieve failed', e?.message ?? e);
          }
        }

        // Mark payment row as paid
        await admin.from("subscription_payments").update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paga_transaction_id: typeof session.subscription === "string" ? session.subscription : null,
          raw_response: session as unknown as Record<string, unknown>,
        }).eq("paga_reference", session.id);

        await activateSubscription(admin, {
          userId, planCode, cycle,
          periodStart, periodEnd, trialEnd, status: dbStatus,
        });

        // Mirror trial_ends_at on the rider row so /billing UI and effective-status
        // RPC show the correct remaining trial days.
        if (trialEnd) {
          await admin.from('riders').update({
            subscription_status: dbStatus === 'trialing' ? 'active' : 'active',
            trial_ends_at: trialEnd.toISOString(),
          }).eq('user_id', userId);
        }
      }
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.subscription;
      if (typeof sub === "string") {
        const subscription = await stripe.subscriptions.retrieve(sub);
        const meta = (subscription.metadata || {}) as Record<string, string>;
        const userId = meta.user_id;
        const planCode = meta.plan_code;
        const cycle = (meta.billing_cycle === "annual" ? "annual" : "monthly") as "monthly" | "annual";
        if (userId && planCode) {
          const start = new Date((subscription.current_period_start ?? Math.floor(Date.now() / 1000)) * 1000);
          const end = new Date((subscription.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000);
          await activateSubscription(admin, { userId, planCode, cycle, periodStart: start, periodEnd: end });

          // Log renewal as a paid payment row
          await admin.from("subscription_payments").insert({
            user_id: userId,
            plan_code: planCode,
            billing_cycle: cycle,
            amount_ngn: Number(meta.amount_ngn || 0),
            paga_reference: `${invoice.id}`,
            paga_transaction_id: sub,
            status: "paid",
            paid_at: new Date().toISOString(),
            raw_response: invoice as unknown as Record<string, unknown>,
          });
        }
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const meta = (subscription.metadata || {}) as Record<string, string>;
      const userId = meta.user_id;
      const planCode = meta.plan_code;
      if (userId && planCode) {
        await admin
          .from("business_subscriptions")
          .update({ status: "cancelled", auto_renew: false })
          .eq("business_user_id", userId)
          .eq("plan_code", planCode);
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      // Reflect Stripe's authoritative status (trialing, active, past_due, unpaid,
      // paused, canceled, incomplete, incomplete_expired) into our DB immediately.
      const subscription = event.data.object as Stripe.Subscription;
      const meta = (subscription.metadata || {}) as Record<string, string>;
      const userId = meta.user_id;
      const planCode = meta.plan_code;
      if (userId && planCode) {
        const stripeStatus = subscription.status; // trialing | active | past_due | unpaid | canceled | incomplete | incomplete_expired | paused
        const dbStatus =
          stripeStatus === 'canceled' ? 'cancelled'
          : stripeStatus === 'unpaid' ? 'past_due'
          : stripeStatus === 'incomplete' || stripeStatus === 'incomplete_expired' ? 'past_due'
          : stripeStatus; // active | trialing | past_due | paused pass through

        const periodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString() : null;
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString() : null;
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString() : null;

        const patch: Record<string, unknown> = {
          status: dbStatus,
          auto_renew: subscription.cancel_at_period_end ? false : true,
          updated_at: new Date().toISOString(),
        };
        if (periodStart) patch.current_period_start = periodStart;
        if (periodEnd) { patch.current_period_end = periodEnd; patch.next_renewal_at = periodEnd; }
        if (trialEnd) patch.trial_ends_at = trialEnd;

        await admin
          .from("business_subscriptions")
          .update(patch)
          .eq("business_user_id", userId)
          .eq("plan_code", planCode);

        // Mirror to riders + linked fleet workers so the admin dashboard reflects the state immediately.
        if (dbStatus === 'paused' || dbStatus === 'past_due' || dbStatus === 'cancelled') {
          const riderStatus = dbStatus === 'cancelled' ? 'cancelled' : dbStatus;
          await admin.from("riders").update({ subscription_status: riderStatus }).eq("user_id", userId);
          await admin.from("business_riders")
            .update({ status: "paused" })
            .eq("business_user_id", userId)
            .eq("status", "active");
        } else if (dbStatus === 'active' || dbStatus === 'trialing') {
          await admin.from("riders").update({ subscription_status: "active" }).eq("user_id", userId);
          await admin.from("business_riders")
            .update({ status: "active" })
            .eq("business_user_id", userId)
            .eq("status", "paused");
        }
      }
    } else if (event.type === "customer.subscription.trial_will_end") {
      // Stripe fires this ~3 days before the trial ends. Just log it — our own
      // 24h reminder cron handles the notification email.
      const subscription = event.data.object as Stripe.Subscription;
      const meta = (subscription.metadata || {}) as Record<string, string>;
      const userId = meta.user_id;
      const planCode = meta.plan_code;
      if (userId && planCode && subscription.trial_end) {
        await admin
          .from("business_subscriptions")
          .update({
            trial_ends_at: new Date(subscription.trial_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("business_user_id", userId)
          .eq("plan_code", planCode);
      }
    } else if (event.type === "invoice.payment_failed") {
      // Card was declined (e.g. insufficient funds). Fall back to wallet debit;
      // if the wallet can't cover it, mark the subscription past_due and pause riders.
      const invoice = event.data.object as Stripe.Invoice;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subId) {
        const subscription = await stripe.subscriptions.retrieve(subId);
        const meta = (subscription.metadata || {}) as Record<string, string>;
        const userId = meta.user_id;
        const planCode = meta.plan_code;
        const cycle = (meta.billing_cycle === "annual" ? "annual" : "monthly") as "monthly" | "annual";
        const amountNgn = Number(meta.amount_ngn || 0);

        if (userId && planCode) {
          // Try to debit the business wallet for this renewal.
          const { data: debit, error: debitErr } = await admin.rpc("debit_wallet_for_subscription", {
            _user_id: userId, _plan_code: planCode, _cycle: cycle,
          });

          const ok = !debitErr && (debit as any)?.ok === true;

          // Log a payment row tracking what happened.
          await admin.from("subscription_payments").insert({
            user_id: userId,
            plan_code: planCode,
            billing_cycle: cycle,
            amount_ngn: amountNgn,
            paga_reference: `${invoice.id}-walletfallback`,
            paga_transaction_id: subId,
            status: ok ? "paid" : "failed",
            paid_at: ok ? new Date().toISOString() : null,
            raw_response: { stripe_invoice: invoice, wallet_result: debit, wallet_error: debitErr?.message } as unknown as Record<string, unknown>,
          });

          if (ok) {
            // Wallet covered it — cancel the failing Stripe sub so future renewals
            // come from the wallet cron, not the declined card.
            try { await stripe.subscriptions.cancel(subId); } catch (_) { /* ignore */ }
            await sendPaymentFailedEmails(admin, {
              userId, outcome: 'wallet_covered', amountNgn, invoiceId: invoice.id,
            });
          } else {
            // No funds: suspend the business and pause its riders.
            await admin
              .from("business_subscriptions")
              .update({ status: "past_due", auto_renew: true })
              .eq("business_user_id", userId);
            await admin.from("riders").update({ subscription_status: "past_due" }).eq("user_id", userId);
            await admin
              .from("business_riders")
              .update({ status: "paused" })
              .eq("business_user_id", userId)
              .eq("status", "active");
            await sendPaymentFailedEmails(admin, {
              userId, outcome: 'paused', amountNgn, invoiceId: invoice.id,
            });
          }
        }
      }
    }
  } catch (e: any) {
    console.error("stripe-webhook handler error", e?.message ?? e, "type=", event.type);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});