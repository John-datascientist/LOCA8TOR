import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hmacSha512(message: string, key: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function addPeriod(from: Date, cycle: string): Date {
  const d = new Date(from)
  if (cycle === 'annual') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

async function notifyBusinessAndRiders(
  supabase: any,
  userId: string,
  template: 'subscription-paused' | 'subscription-restored',
  reference: string,
) {
  try {
    const { data: business } = await supabase.from('riders')
      .select('full_name, business_name').eq('user_id', userId).maybeSingle()
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    const businessEmail = authUser?.user?.email
    const businessName = business?.business_name || business?.full_name || 'your business'

    if (businessEmail) {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: template,
          recipientEmail: businessEmail,
          idempotencyKey: `${template}-business-${userId}-${reference}`,
          templateData: { name: business?.full_name || null, businessName, recipientRole: 'business' },
        },
      }).catch(() => {})
    }

    const { data: linkedRiders } = await supabase.from('business_riders')
      .select('rider_name, email').eq('business_user_id', userId)
    for (const r of (linkedRiders || [])) {
      if (!r.email) continue
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: template,
          recipientEmail: r.email,
          idempotencyKey: `${template}-rider-${r.email}-${reference}`,
          templateData: { name: r.rider_name || null, businessName, recipientRole: 'rider' },
        },
      }).catch(() => {})
    }
  } catch (e) {
    console.error('notifyBusinessAndRiders failed', e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const PAGA_HMAC_KEY = Deno.env.get('PAGA_HMAC_KEY') || ''
    if (!PAGA_HMAC_KEY) {
      return new Response(JSON.stringify({ error: 'webhook_not_configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const payload = await req.json().catch(() => ({}))
    const reference = payload?.referenceNumber || payload?.reference
    const transactionId = payload?.transactionId
    const amount = payload?.amount
    const statusCode = payload?.statusCode ?? payload?.responseCode

    // Verify signature when provided
    const incomingHash = req.headers.get('hash') || payload?.hash || ''
    if (PAGA_HMAC_KEY) {
      if (!incomingHash) {
        return new Response(JSON.stringify({ error: 'missing_signature' }), { status: 401, headers: corsHeaders })
      }
      const expected = await hmacSha512(`${reference}${amount}NGN`, PAGA_HMAC_KEY)
      if (expected !== incomingHash) {
        return new Response(JSON.stringify({ error: 'invalid_signature' }), { status: 401, headers: corsHeaders })
      }
    }

    if (!reference) {
      return new Response(JSON.stringify({ error: 'missing_reference' }), { status: 400, headers: corsHeaders })
    }

    // ===== Direct subscription checkout references =====
    if (typeof reference === 'string' && reference.startsWith('SUB')) {
      const { data: pay } = await supabase.from('subscription_payments')
        .select('*').eq('paga_reference', reference).maybeSingle()
      if (!pay) return new Response(JSON.stringify({ error: 'payment_not_found' }), { status: 404, headers: corsHeaders })

      const ok = statusCode === 0 || statusCode === '0' || payload?.status === 'SUCCESS'
      await supabase.from('subscription_payments').update({
        status: ok ? 'paid' : 'failed',
        paga_transaction_id: transactionId ?? null,
        paid_at: ok ? new Date().toISOString() : null,
        raw_response: payload,
      }).eq('id', pay.id)

      if (ok) {
        const start = new Date()
        const end = addPeriod(start, pay.billing_cycle)
        // Deactivate any existing active/past_due sub for this user, then insert fresh.
        await supabase.from('business_subscriptions')
          .update({ status: 'cancelled' })
          .eq('business_user_id', pay.user_id)
          .in('status', ['active', 'past_due'])
        await supabase.from('business_subscriptions').insert({
          business_user_id: pay.user_id,
          plan_code: pay.plan_code,
          billing_cycle: pay.billing_cycle,
          status: 'active',
          current_period_start: start.toISOString(),
          current_period_end: end.toISOString(),
          next_renewal_at: end.toISOString(),
          auto_renew: false,
        })
        await supabase.from('riders').update({ subscription_status: 'active' }).eq('user_id', pay.user_id)
        await notifyBusinessAndRiders(supabase, pay.user_id, 'subscription-restored', reference)
        await supabase.rpc('check_rider_referral_qualification', { _referred_user_id: pay.user_id }).catch(() => {})
      }

      return new Response(JSON.stringify({ success: true, ok }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ===== Wallet funding references =====
    if (typeof reference === 'string' && reference.startsWith('WAL')) {
      const { data: walTx } = await supabase.from('wallet_transactions')
        .select('*').eq('provider_reference', reference).maybeSingle()
      if (!walTx) return new Response(JSON.stringify({ error: 'wallet_tx_not_found' }), { status: 404, headers: corsHeaders })

      const ok = statusCode === 0 || statusCode === '0' || payload?.status === 'SUCCESS'
      if (!ok) {
        await supabase.from('wallet_transactions')
          .update({ status: 'failed', metadata: payload }).eq('id', walTx.id)
        return new Response(JSON.stringify({ success: true, ok: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Idempotent credit via RPC (uses provider_reference for de-duplication).
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('credit_wallet', {
        _user_id: walTx.business_user_id,
        _amount: Number(amount ?? walTx.amount),
        _provider_reference: reference,
        _method: walTx.payment_method,
        _description: walTx.description,
      })
      if (rpcErr) {
        return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers: corsHeaders })
      }
      return new Response(JSON.stringify({ success: true, result: rpcRes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ===== Legacy direct-debit subscription path =====
    const { data: pay } = await supabase.from('subscription_payments')
      .select('*').eq('paga_reference', reference).maybeSingle()
    if (!pay) return new Response(JSON.stringify({ error: 'payment_not_found' }), { status: 404, headers: corsHeaders })

    const ok = statusCode === 0 || statusCode === '0' || payload?.status === 'SUCCESS'
    await supabase.from('subscription_payments').update({
      status: ok ? 'paid' : 'failed',
      paga_transaction_id: transactionId ?? null,
      paid_at: ok ? new Date().toISOString() : null,
      raw_response: payload,
    }).eq('id', pay.id)

    if (!ok && pay.user_id) {
      // Failed payment — pause the business and its rider profile so all gated
      // routes redirect to /billing until the user pays again.
      if (pay.subscription_id) {
        await supabase.from('subscriptions').update({ status: 'paused' }).eq('id', pay.subscription_id)
      }
      await supabase.from('riders').update({ subscription_status: 'paused' }).eq('user_id', pay.user_id)
      await notifyBusinessAndRiders(supabase, pay.user_id, 'subscription-paused', reference)
    }

    if (ok && pay.subscription_id) {
      const { data: sub } = await supabase.from('subscriptions').select('*').eq('id', pay.subscription_id).maybeSingle()
      const start = new Date()
      const end = addPeriod(start, pay.billing_cycle)
      await supabase.from('subscriptions').update({
        status: 'active',
        billing_cycle: pay.billing_cycle,
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
      }).eq('id', sub!.id)

      // Lift any paused/none flag on the business rider profile so gates reopen.
      if (pay.user_id) {
        await supabase.from('riders').update({ subscription_status: 'active' }).eq('user_id', pay.user_id)
        await notifyBusinessAndRiders(supabase, pay.user_id, 'subscription-restored', reference)
      }

      // Subscription is now active — check if this user was referred and now qualifies.
      if (pay.user_id) {
        await supabase.rpc('check_rider_referral_qualification', {
          _referred_user_id: pay.user_id,
        }).catch(() => {})
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})