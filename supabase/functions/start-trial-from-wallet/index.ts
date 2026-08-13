import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    })
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: u } = await userClient.auth.getUser()
    const user = u?.user
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })

    const body = await req.json().catch(() => ({}))
    const plan_code = String(body?.plan_code || '')
    const cycle = body?.billing_cycle === 'annual' ? 'annual' : 'monthly'
    if (!plan_code) {
      return new Response(JSON.stringify({ error: 'plan_code_required' }), { status: 400, headers: corsHeaders })
    }

    const { data: plan } = await admin.from('subscription_plans')
      .select('code, monthly_price_ngn, annual_price_ngn, is_active').eq('code', plan_code).maybeSingle()
    if (!plan || !plan.is_active) {
      return new Response(JSON.stringify({ error: 'plan_not_found' }), { status: 404, headers: corsHeaders })
    }
    const amount = cycle === 'annual' ? plan.annual_price_ngn : plan.monthly_price_ngn

    const { data: wallet } = await admin.from('business_wallets')
      .select('balance_ngn').eq('business_user_id', user.id).maybeSingle()
    const balance = Number((wallet as any)?.balance_ngn ?? 0)
    if (balance < amount) {
      return new Response(JSON.stringify({
        error: 'insufficient_balance',
        insufficient_balance: true,
        balance_ngn: balance,
        required_ngn: amount,
        shortfall_ngn: Math.max(0, amount - balance),
        message: `Wallet must have at least ₦${Number(amount).toLocaleString()} to start the 7-day trial. Current balance: ₦${balance.toLocaleString()}.`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Cancel any existing active sub for this user
    await admin.from('business_subscriptions')
      .update({ status: 'cancelled', auto_renew: false })
      .eq('business_user_id', user.id)
      .in('status', ['active', 'past_due'])

    const now = new Date()

    // Continue any prior trial rather than starting a fresh 7 days on plan switch.
    // Original trial start is inferred from the earliest trial_ends_at we stored on the
    // rider profile (trial_ends_at = original_start + 7d).
    const { data: riderRow } = await admin.from('riders')
      .select('trial_ends_at').eq('user_id', user.id).maybeSingle()
    const priorTrialEnd = (riderRow as any)?.trial_ends_at ? new Date((riderRow as any).trial_ends_at) : null
    let trialEnd: Date
    if (priorTrialEnd && !isNaN(priorTrialEnd.getTime())) {
      // Preserve the original trial end date — user keeps whatever days remain.
      trialEnd = priorTrialEnd.getTime() > now.getTime() ? priorTrialEnd : now
    } else {
      trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }

    const { data: inserted, error: insErr } = await admin.from('business_subscriptions').insert({
      business_user_id: user.id,
      plan_code,
      billing_cycle: cycle,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
      next_renewal_at: trialEnd.toISOString(),
      auto_renew: true,
    }).select('id').maybeSingle()
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 400, headers: corsHeaders })
    }

    // Sync riders table so get_effective_subscription_status sees the trial
    await admin.from('riders').update({
      subscription_status: 'active',
      trial_ends_at: trialEnd.toISOString(),
    }).eq('user_id', user.id)

    // Log a pending trial entry (no debit)
    await admin.from('subscription_payments').insert({
      user_id: user.id,
      plan_code,
      billing_cycle: cycle,
      amount_ngn: amount,
      paga_reference: `trial_${inserted?.id}`,
      status: 'pending',
      raw_request: { provider: 'wallet', trial: true, trial_ends_at: trialEnd.toISOString() },
    })

    return new Response(JSON.stringify({
      ok: true, trial_ends_at: trialEnd.toISOString(), amount_ngn: amount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders })
  }
})