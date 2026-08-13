import Stripe from 'https://esm.sh/stripe@17.5.0?target=deno'
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

    const { data: sub } = await admin.from('business_subscriptions')
      .select('id, plan_code, billing_cycle')
      .eq('business_user_id', user.id)
      .in('status', ['active', 'past_due'])
      .maybeSingle()
    if (!sub) {
      return new Response(JSON.stringify({ error: 'no_active_subscription' }), { status: 404, headers: corsHeaders })
    }

    // Best-effort: cancel any Stripe subscription tied to this user/plan
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' })
        const { data: payments } = await admin.from('subscription_payments')
          .select('paga_transaction_id')
          .eq('user_id', user.id)
          .eq('plan_code', sub.plan_code)
          .eq('status', 'paid')
          .not('paga_transaction_id', 'is', null)
          .order('paid_at', { ascending: false })
          .limit(1)
        const stripeSubId = (payments as any[])?.[0]?.paga_transaction_id
        if (stripeSubId && typeof stripeSubId === 'string' && stripeSubId.startsWith('sub_')) {
          await stripe.subscriptions.cancel(stripeSubId).catch((e) => {
            console.warn('stripe cancel failed', e?.message)
          })
        }
      } catch (e) {
        console.warn('stripe cancel skipped', (e as any)?.message)
      }
    }

    const { error } = await admin.from('business_subscriptions').update({
      status: 'cancelled', auto_renew: false,
    }).eq('id', sub.id)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
    }

    // Sync riders table so get_effective_subscription_status reflects cancellation
    await admin.from('riders').update({ subscription_status: 'cancelled' }).eq('user_id', user.id)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders })
  }
})