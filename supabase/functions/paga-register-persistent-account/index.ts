import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Force LIVE Paga Collect endpoint, matching paga-create-payment/paga-subscribe.
const PAGA_BASE = 'https://collect.paga.com'

async function sha512Hex(message: string): Promise<string> {
  const enc = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-512', enc.encode(message))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const PAGA_PUBLIC_KEY = (Deno.env.get('PAGA_PUBLIC_KEY') || '').trim()
    const PAGA_SECRET_KEY = (Deno.env.get('PAGA_SECRET_KEY') || '').trim()
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

    // Idempotent — return the existing account if this user already has one.
    const { data: existing } = await supabase
      .from('user_paga_accounts')
      .select('account_number, account_reference')
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) {
      return new Response(JSON.stringify({
        account_number: existing.account_number,
        account_reference: existing.account_reference,
        bank_name: 'Paga',
        already_existed: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: rider } = await supabase
      .from('riders')
      .select('full_name, phone, business_name, account_type')
      .eq('user_id', user.id)
      .maybeSingle()

    const fullName = String((rider as any)?.business_name || (rider as any)?.full_name || user.email?.split('@')[0] || 'Loca8tor User').trim()
    const nameParts = fullName.split(/\s+/).filter(Boolean)
    const firstName = nameParts[0] || 'Loca8tor'
    const lastName = nameParts.slice(1).join(' ') || 'User'

    const rawPhone = String((rider as any)?.phone || '').replace(/[^0-9]/g, '')
    let phoneNumber = rawPhone
    if (rawPhone.startsWith('234') && rawPhone.length === 13) phoneNumber = '0' + rawPhone.slice(3)
    else if (rawPhone.length === 10 && /^[7-9]/.test(rawPhone)) phoneNumber = '0' + rawPhone
    if (!/^0[7-9][0-9]{9}$/.test(phoneNumber)) {
      return new Response(JSON.stringify({ error: 'A valid Nigerian phone number is required on your profile before creating an account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const email = String(user.email || '').trim()

    const randomSuffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4).toUpperCase().padEnd(4, '0')
    const referenceNumber = `LOCPA${Date.now()}${randomSuffix}`
    // Deterministic-looking but unique per user — this becomes the permanent
    // identifier for this account on Paga's side (updates/lookups use it).
    const accountReference = `LOCPR${user.id.replace(/-/g, '').slice(0, 16).toUpperCase()}`

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/paga-webhook`

    // financialIdentificationNumber (BVN) is deliberately omitted — we don't
    // collect it from users. Paga's own backend may still require it for a
    // real bank-transferable NUBAN (this is commonly a CBN/KYC requirement,
    // not just something their API library asks for) — if so, the request
    // below will come back with an error from Paga saying so, which is the
    // only way to confirm this for certain without official docs access.
    const payload: Record<string, unknown> = {
      referenceNumber,
      phoneNumber,
      email,
      firstName,
      lastName,
      accountName: fullName,
      accountReference,
      callbackUrl,
    }

    // Hash per Paga Collect /registerPersistentPaymentAccount spec:
    //   SHA-512(referenceNumber + accountReference + financialIdentificationNumber
    //            + creditBankId + creditBankAccountNumber + callbackUrl + hashKey)
    // financialIdentificationNumber/creditBankId/creditBankAccountNumber are
    // all omitted, so those positions are empty strings in the hash input.
    const hashInputSafe = `${referenceNumber}${accountReference}${callbackUrl}`
    const hash = await sha512Hex(`${hashInputSafe}${PAGA_HMAC_KEY}`)

    const url = `${PAGA_BASE}/registerPersistentPaymentAccount`
    console.log('PAGA /registerPersistentPaymentAccount request', {
      endpoint: url,
      referenceNumber,
      accountReference,
      userId: user.id,
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
    console.log('PAGA /registerPersistentPaymentAccount response', { status: pagaRes.status, body: pagaText.slice(0, 800) })
    let pagaJson: any = {}
    try { pagaJson = JSON.parse(pagaText) } catch { pagaJson = { raw: pagaText } }

    const inner = pagaJson?.response ?? pagaJson
    const statusCode = String(inner?.response ?? inner?.statusCode ?? inner?.responseCode ?? '')
    const accountNumber = inner?.accountNumber

    if (!pagaRes.ok || pagaJson?.error === true || statusCode !== '0' || !accountNumber) {
      return new Response(JSON.stringify({
        error: inner?.message || pagaJson?.message || pagaJson?.raw || `Paga HTTP ${pagaRes.status}`,
        raw: pagaJson,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.from('user_paga_accounts').insert({
      user_id: user.id,
      account_number: accountNumber,
      account_reference: accountReference,
    })

    return new Response(JSON.stringify({
      account_number: accountNumber,
      account_reference: accountReference,
      bank_name: 'Paga',
      already_existed: false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
