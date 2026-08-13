import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Bank-transfer subscription uses Paga's standard Collect environment.
const PAGA_BASE = (Deno.env.get('PAGA_COLLECT_BASE_URL') || 'https://collect.paga.com').replace(/\/+$/, '')

// Static company Paga collection account. We ALWAYS display this to subscribers
// instead of any bank details returned by Paga's paymentRequest response, so that
// no personal / settlement NUBAN is ever surfaced to end users. Payments are
// reconciled by the unique `reference` included in the transfer narration.
const COMPANY_PAGA_ACCOUNT = {
  bankName: 'Paga',
  accountNumber: '1174833267',
  accountName: 'Workerholics Solutions Limited',
}

async function sha512Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(message))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const PAGA_PUBLIC_KEY = (Deno.env.get('PAGA_PUBLIC_KEY') || '').trim()
    const PAGA_SECRET_KEY = (Deno.env.get('PAGA_SECRET_KEY') || '').trim()
    const PAGA_HMAC_KEY = (Deno.env.get('PAGA_HMAC_KEY') || '').trim()
    if (!PAGA_PUBLIC_KEY || !PAGA_SECRET_KEY || !PAGA_HMAC_KEY) {
      return new Response(JSON.stringify({ error: 'Paga keys not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const auth = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    )
    const { data: userRes } = await userClient.auth.getUser()
    const user = userRes?.user
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })

    const body = await req.json().catch(() => ({}))
    const plan_code = String(body?.plan_code || '').trim()
    const billing_cycle = body?.billing_cycle === 'annual' ? 'annual' : 'monthly'
    if (!plan_code) {
      return new Response(JSON.stringify({ error: 'plan_code required' }), { status: 400, headers: corsHeaders })
    }

    // Verify the user is a business and look up the plan price
    const [{ data: rider }, { data: plan }] = await Promise.all([
      supabase.from('riders').select('account_type, full_name, business_name, phone').eq('user_id', user.id).maybeSingle(),
      supabase.from('subscription_plans').select('*').eq('code', plan_code).eq('is_active', true).maybeSingle(),
    ])
    if (!rider || rider.account_type !== 'business') {
      return new Response(JSON.stringify({ error: 'business_account_required' }), { status: 403, headers: corsHeaders })
    }
    if (!plan) {
      return new Response(JSON.stringify({ error: 'plan_not_found' }), { status: 404, headers: corsHeaders })
    }

    const orderAmount = Number(billing_cycle === 'annual' ? plan.annual_price_ngn : plan.monthly_price_ngn)
    if (!Number.isFinite(orderAmount) || orderAmount < 100) {
      return new Response(JSON.stringify({ error: 'invalid_plan_amount' }), { status: 400, headers: corsHeaders })
    }
    // Paga charges 0.75% capped at ₦1,000; payer covers it.
    const pagaFee = Math.min(Math.ceil(orderAmount * 0.0075), 1000)
    const amount = orderAmount + pagaFee

    const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4).toUpperCase().padEnd(4, '0')
    const reference = `SUB${Date.now()}${rand}`

    const payerEmail = (user.email || '').toString().trim()
    const digits = String(rider.phone || '').replace(/[^0-9]/g, '')
    let payerPhone = digits
    if (digits.startsWith('234') && digits.length === 13) payerPhone = '0' + digits.slice(3)
    else if (digits.length === 10 && /^[7-9]/.test(digits)) payerPhone = '0' + digits
    const payerName = rider.business_name || rider.full_name || payerEmail
    const payeeName = (Deno.env.get('PAGA_PAYEE_NAME') || 'Loca8tor').trim()

    // Save pending payment row keyed by reference (unique).
    const { error: insErr } = await supabase.from('subscription_payments').insert({
      user_id: user.id,
      plan_code,
      billing_cycle,
      amount_ngn: orderAmount,
      paga_reference: reference,
      status: 'pending',
      raw_request: { method: 'bank_transfer', orderAmount, pagaFee, amount },
    })
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders })
    }

    const expiryDateTimeUTC = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().replace(/\.\d{3}Z$/, '')
    const payload: any = {
      referenceNumber: reference,
      amount,
      currency: 'NGN',
      payer: { name: payerName, phoneNumber: payerPhone, email: payerEmail },
      payee: { name: payeeName },
      expiryDateTimeUTC,
      isSuppressMessages: false,
      isSuspendedAfterFirstUse: true,
      payerCollectionFeeShare: 1.0,
      payeeCollectionFeeShare: 0.0,
      isAllowPartialPayments: false,
      isAllowOverPayments: false,
      callBackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paga-webhook`,
      paymentMethods: ['BANK_TRANSFER', 'FUNDING_USSD'],
      displayBankDetailToPayer: false,
    }

    // Paga hash spec: referenceNumber + amount + currency + payer.phoneNumber + payer.email + HMAC_KEY
    const hashInput = `${reference}${amount}NGN${payerPhone}${payerEmail}${PAGA_HMAC_KEY}`
    const hash = await sha512Hex(hashInput)

    console.log('paga-subscribe request', { reference, plan_code, billing_cycle, amount })

    let pagaRes: Response | null = null
    let text = ''
    let lastErr: unknown = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        pagaRes = await fetch(`${PAGA_BASE}/paymentRequest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'identity',
            'User-Agent': 'Loca8tor-Edge/1.0',
            'Connection': 'close',
            'Authorization': `Basic ${btoa(`${PAGA_PUBLIC_KEY}:${PAGA_SECRET_KEY}`)}`,
            'hash': hash,
          },
          body: JSON.stringify(payload),
        })
        text = await pagaRes.text()
        console.log('paga-subscribe response', { attempt, status: pagaRes.status, body: text.slice(0, 800) })
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        await new Promise((r) => setTimeout(r, 400 * attempt))
      }
    }
    if (lastErr || !pagaRes) {
      await supabase.from('subscription_payments').update({ status: 'failed', raw_response: { error: String((lastErr as any)?.message ?? lastErr) } }).eq('paga_reference', reference)
      return new Response(JSON.stringify({ error: `Could not reach Paga: ${String((lastErr as any)?.message ?? lastErr)}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    let json: any = {}
    try { json = JSON.parse(text) } catch { json = { raw: text } }

    const statusCode = String(json?.statusCode ?? json?.responseCode ?? '')
    if (!pagaRes.ok || statusCode !== '0') {
      const pagaMessage = json?.error || json?.statusMessage || json?.message || `Paga HTTP ${pagaRes.status}`
      await supabase.from('subscription_payments').update({ status: 'failed', raw_response: json }).eq('paga_reference', reference)
      return new Response(JSON.stringify({ error: pagaMessage, raw: json }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const paymentUrl = json?.paymentLink || json?.paymentUrl || json?.url || null
    // SECURITY: never surface bank details from Paga's response. Always display
    // the static company Paga account. Paga still matches the payment via the
    // unique referenceNumber which the payer includes in the transfer narration.
    const methodDetails = { ...COMPANY_PAGA_ACCOUNT }

    await supabase.from('subscription_payments').update({
      checkout_url: paymentUrl,
      raw_response: json,
    }).eq('paga_reference', reference)

    return new Response(JSON.stringify({
      reference,
      payment_url: paymentUrl,
      method_details: methodDetails,
      plan_amount: orderAmount,
      paga_fee: pagaFee,
      transfer_amount: amount,
      expires_at: json?.expiryDateTimeUTC || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('paga-subscribe exception', String(e?.message ?? e))
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})