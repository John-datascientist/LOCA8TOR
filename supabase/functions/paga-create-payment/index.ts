import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Force LIVE Paga Collect endpoint. Do NOT read PAGA_BASE_URL — we never want
// to accidentally hit the sandbox (https://beta-collect.paga.com).
const PAGA_BASE = 'https://collect.paga.com'

async function sha512Hex(message: string): Promise<string> {
  const enc = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-512', enc.encode(message.trim()))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const PAGA_PUBLIC_KEY = (Deno.env.get('PAGA_PUBLIC_KEY') || Deno.env.get('PAGA_USERNAME') || '').trim()
    const PAGA_SECRET_KEY = (Deno.env.get('PAGA_SECRET_KEY') || Deno.env.get('PAGA_PASSWORD') || '').trim()
    const PAGA_HMAC_KEY = (Deno.env.get('PAGA_HMAC_KEY') || '').trim()
    if (!PAGA_PUBLIC_KEY || !PAGA_SECRET_KEY || !PAGA_HMAC_KEY) {
      return new Response(JSON.stringify({ error: 'Paga keys not configured yet. Add PAGA_PUBLIC_KEY, PAGA_SECRET_KEY, PAGA_HMAC_KEY in backend secrets.' }),
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
    const {
      plan_code,
      billing_cycle,
      full_name,
      email,
      phone,
      address,
      bank_id,
      bank_account_number,
      bank_name,
    } = body || {}
    if (!plan_code || !['monthly','annual'].includes(billing_cycle)) {
      return new Response(JSON.stringify({ error: 'plan_code and billing_cycle required' }), { status: 400, headers: corsHeaders })
    }
    // Direct Debit requires the payer's full bank details.
    const payerName = (full_name || '').toString().trim()
    const payerEmail = (email || user.email || '').toString().trim()
    const rawPhone = (phone || '').toString()
    const digits = rawPhone.replace(/[^0-9]/g, '')
    let payerPhone = digits
    if (digits.startsWith('234') && digits.length === 13) payerPhone = '0' + digits.slice(3)
    else if (digits.length === 10 && /^[7-9]/.test(digits)) payerPhone = '0' + digits
    const payerAddress = (address || '').toString().trim()
    const payerBankId = (bank_id || '').toString().trim()
    const payerBankAccount = (bank_account_number || '').toString().replace(/[^0-9]/g, '')

    const missing: string[] = []
    if (!payerName) missing.push('full name')
    if (!payerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payerEmail)) missing.push('valid email')
    if (!/^0[7-9][0-9]{9}$/.test(payerPhone)) missing.push('valid Nigerian phone (e.g. 08012345678)')
    if (!payerAddress || payerAddress.length < 5) missing.push('billing address registered with your bank')
    if (!payerBankId) missing.push('bank')
    if (!/^[0-9]{10}$/.test(payerBankAccount)) missing.push('10-digit bank account number')
    if (missing.length) {
      return new Response(JSON.stringify({ error: `Please provide: ${missing.join(', ')}.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: plan } = await supabase.from('subscription_plans').select('*').eq('code', plan_code).maybeSingle()
    if (!plan) return new Response(JSON.stringify({ error: 'plan_not_found' }), { status: 404, headers: corsHeaders })

    const amount = Number(billing_cycle === 'annual' ? plan.annual_price_ngn : plan.monthly_price_ngn)
    // Paga reference numbers must be short alphanumeric strings.
    const randomSuffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4).toUpperCase().padEnd(4, '0')
    const reference = `LOC${Date.now()}${randomSuffix}`
    // Internal tokenisation identifier for this mandate — returned in callbacks
    // as `accountReference` and used to recurring-charge the user later.
    const accountReference = `LOCM${Date.now()}${randomSuffix}`

    // Ensure a pending subscription exists for this user/plan
    let { data: sub } = await supabase.from('subscriptions')
      .select('*').eq('user_id', user.id).eq('plan_code', plan_code).maybeSingle()
    if (!sub) {
      const ins = await supabase.from('subscriptions').insert({
        user_id: user.id, plan_code, billing_cycle, status: 'pending',
        account_reference: accountReference,
        mandate_status: 'PENDING',
        payer_bank_id: payerBankId,
        payer_bank_account_number: payerBankAccount,
        payer_bank_name: bank_name || null,
      }).select('*').single()
      sub = ins.data
    } else {
      await supabase.from('subscriptions').update({
        billing_cycle,
        account_reference: accountReference,
        mandate_status: 'PENDING',
        payer_bank_id: payerBankId,
        payer_bank_account_number: payerBankAccount,
        payer_bank_name: bank_name || null,
      }).eq('id', sub.id)
    }

    // Paga Collect: Direct Debit tokenization (POST /paymentRequest with
    // paymentMethods: ["DIRECT_DEBIT"]). The customer is the PAYER whose
    // bank account will be debited; the merchant is the PAYEE.
    const payeeName = (Deno.env.get('PAGA_PAYEE_NAME') || 'Loca8tor').trim()
    // Mandate valid for 5 years (Paga's maximum).
    const expiryDateTimeUTC = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)
      .toISOString().replace(/\.\d{3}Z$/, '')
    const payload: any = {
      referenceNumber: reference,
      amount,
      currency: 'NGN',
      accountReference,
      isSingleUse: false,
      payer: {
        name: payerName,
        phoneNumber: payerPhone,
        email: payerEmail,
        address: payerAddress,
        bankId: payerBankId,
        bankAccountNumber: payerBankAccount,
      },
      payee: { name: payeeName },
      expiryDateTimeUTC,
      payerCollectionFeeShare: 0.0,
      payeeCollectionFeeShare: 1.0,
      isAllowPartialPayments: true,
      callBackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paga-webhook`,
      paymentMethods: ['DIRECT_DEBIT'],
    }
    // Hash per Paga Collect /paymentRequest spec:
    //   SHA-512(referenceNumber + amount + currency + payer.phoneNumber + payer.email + hashKey)
    const hashInputSafe = `${reference}${amount}NGN${payerPhone}${payerEmail}`
    const hash = await sha512Hex(`${hashInputSafe}${PAGA_HMAC_KEY}`)
    const url = `${PAGA_BASE}/paymentRequest`
    const safePayload = { ...payload, payer: { ...payload.payer, bankAccountNumber: '****' + payerBankAccount.slice(-4) } }
    console.log('PAGA /paymentRequest request', {
      endpoint: url,
      method: 'POST',
      payload: safePayload,
      hashInput: `${hashInputSafe}<HMAC_KEY>`,
    })
    const pagaRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${PAGA_PUBLIC_KEY}:${PAGA_SECRET_KEY}`)}`,
        'hash': hash,
      },
      body: JSON.stringify(payload),
    })
    const pagaText = await pagaRes.text()
    console.log('PAGA /paymentRequest response', { status: pagaRes.status, body: pagaText.slice(0, 800) })
    let pagaJson: any = {}
    try { pagaJson = JSON.parse(pagaText) } catch { pagaJson = { raw: pagaText } }
    // Paga Direct Debit responds with `statusCode` (not `responseCode`).
    const statusCode = String(pagaJson?.statusCode ?? pagaJson?.responseCode ?? '')
    const directDebitMethod = Array.isArray(pagaJson?.paymentMethods)
      ? pagaJson.paymentMethods.find((m: any) => m?.name === 'DIRECT_DEBIT')
      : null
    const activation = directDebitMethod?.properties || {}
    console.log('PAGA DirectDebit', PAGA_BASE, pagaRes.status, `ref=${reference}`, `acctRef=${accountReference}`, pagaText.slice(0, 500))

    await supabase.from('subscription_payments').insert({
      subscription_id: sub?.id, user_id: user.id, plan_code, billing_cycle,
      amount_ngn: amount, paga_reference: reference,
      account_reference: accountReference,
      mandate_status: pagaRes.ok && statusCode === '0' ? 'PENDING' : null,
      raw_request: payload, raw_response: pagaJson,
      status: pagaRes.ok && statusCode === '0' ? 'pending' : 'failed',
    })

    if (!pagaRes.ok || statusCode !== '0') {
      return new Response(JSON.stringify({
          error: pagaJson?.error || pagaJson?.statusMessage || pagaJson?.message || pagaJson?.raw || `Paga HTTP ${pagaRes.status}`,
          status: pagaRes.status,
          raw: pagaJson,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      reference,
      account_reference: accountReference,
      activation_amount: activation.activationAmount || null,
      activation_account_number: activation.activationAccountNumber || null,
      activation_bank_name: activation.activationBankName || null,
      expiry: pagaJson?.expiryDateTimeUTC || expiryDateTimeUTC,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})