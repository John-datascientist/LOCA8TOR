// Returns the list of banks supported by Paga (uuid + name).
// Uses only the canonical live Collect credentials; do not probe sandbox or
// stale Direct-Debit-specific secrets because repeated bad auth locks Paga.

const PAGA_BASE = 'https://collect.paga.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sha512Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(message.trim()))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function callBanks(base: string, publicKey: string, secretKey: string, hmacKey: string) {
  // Paga docs sample uses a short numeric reference (e.g. "12345"). Use digits-only to avoid edge cases.
  const referenceNumber = `${Date.now()}`
  const hash = await sha512Hex(`${referenceNumber}${hmacKey}`)
  const payload = { referenceNumber }
  const url = `${base}/banks`
  console.log('PAGA /banks request', { endpoint: url, payload, hashInput: `${referenceNumber}<HMAC_KEY>` })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${btoa(`${publicKey}:${secretKey}`)}`,
      'hash': hash,
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  console.log('PAGA /banks response', { base, status: res.status, body: text.slice(0, 800) })
  let json: any
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { res, json, text }
}

async function getEgressIp(): Promise<string> {
  try {
    const r = await fetch('https://api.ipify.org?format=json')
    const j = await r.json()
    return j.ip || ''
  } catch { return '' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const publicKey = (Deno.env.get('PAGA_PUBLIC_KEY') || '').trim()
    const secretKey = (Deno.env.get('PAGA_SECRET_KEY') || '').trim()
    const hmacKey = (Deno.env.get('PAGA_HMAC_KEY') || '').trim()
    if (!publicKey || !secretKey || !hmacKey) {
      return new Response(JSON.stringify({ error: 'Paga business credentials not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Try LIVE Collect only.
    const live = await callBanks(PAGA_BASE, publicKey, secretKey, hmacKey)
    let { res, json } = live

    let diagnosis: any = null
    if (!res.ok || (json?.statusCode !== undefined && String(json.statusCode) !== '0')) {
      const egressIp = await getEgressIp()
      diagnosis = {
        egress_ip: egressIp,
        live: { status: res.status, statusCode: json?.statusCode, statusMessage: json?.statusMessage },
        hint: `Live Collect returned ${res.status}. Do not retry until the Paga account is unlocked if the response mentions failed password attempts. Egress IP: ${egressIp}.`,
      }
      console.log('PAGA diagnosis', diagnosis)
    }

    if (!res.ok || (json?.statusCode !== undefined && String(json.statusCode) !== '0')) {
      return new Response(JSON.stringify({
        error: json?.statusMessage || json?.message || json?.raw || `Paga HTTP ${res.status}`,
        raw: json,
        diagnosis,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const banks = Array.isArray(json) ? json : (Array.isArray(json?.banks) ? json.banks : (Array.isArray(json?.bank) ? json.bank : (Array.isArray(json?.data) ? json.data : [])))
    const sorted = banks
      .map((b: any) => ({ uuid: b.uuid || b.bankId || b.id || b.code || '', name: b.name || b.bankName || '' }))
      .filter((b: any) => b.uuid && b.name)
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
    return new Response(JSON.stringify({ banks: sorted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})