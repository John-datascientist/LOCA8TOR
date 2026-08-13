// Paga Collect edge function.
// Single endpoint. Route by `operation` field in JSON body:
//   { operation: 'getBanks' }       -> POST https://<base>/banks
//   { operation: 'createMandate' }  -> POST https://<base>/paymentRequest (DIRECT_DEBIT)
//
// Auth env vars: PAGA_PUBLIC_KEY, PAGA_SECRET_KEY, PAGA_HMAC_KEY

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Direct Debit uses Paga's dedicated "blue-collect" environment with its own keys.
const PAGA_BASE = (Deno.env.get('PAGA_DD_BASE_URL') || 'https://blue-collect.paga.com').replace(/\/+$/, '')

async function sha512Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(message))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getKeys() {
  // The merchant confirmed Collect and Direct Debit use the same live key set.
  // Use the canonical Collect secrets so stale PAGA_DD_* values cannot override them.
  const publicKey = (Deno.env.get('PAGA_PUBLIC_KEY') || '').trim()
  const secretKey = (Deno.env.get('PAGA_SECRET_KEY') || '').trim()
  const hmacKey = (Deno.env.get('PAGA_HMAC_KEY') || '').trim()
  return { publicKey, secretKey, hmacKey }
}

function basicAuth(publicKey: string, secretKey: string) {
  return `Basic ${btoa(`${publicKey}:${secretKey}`)}`
}

function newReference(prefix: string) {
  const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase()
  return `${prefix}-${Date.now()}-${rand}`
}

async function getEgressIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data?.ip || ''
  } catch {
    return ''
  }
}

async function handleBanks() {
  const { publicKey, secretKey, hmacKey } = getKeys()
  if (!publicKey || !secretKey || !hmacKey) {
    return json({ error: 'Paga credentials not configured' }, 503)
  }
  // Paga /banks is picky on live: use a short digits-only reference like their docs sample.
  const referenceNumber = `${Date.now()}`
  const hash = await sha512Hex(`${referenceNumber}${hmacKey}`)
  const url = `${PAGA_BASE}/banks`
  const payload = { referenceNumber }
  console.log('paga-collect /banks request', { url, payload, hashInput: `${referenceNumber}<HMAC_KEY>` })
  let res: Response
  let text = ''
  let lastErr: unknown = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'identity',
          'User-Agent': 'Loca8tor-Edge/1.0',
          Connection: 'close',
          Authorization: basicAuth(publicKey, secretKey),
          hash,
        },
        body: JSON.stringify(payload),
      })
      // Stream-read tolerantly: some upstreams close the connection before
      // sending a proper EOF chunk which breaks res.text()/arrayBuffer().
      const reader = res.body?.getReader()
      const chunks: Uint8Array[] = []
      if (reader) {
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
          }
        } catch (streamErr) {
          console.warn('paga-collect /banks stream ended with error, using partial body', String((streamErr as any)?.message ?? streamErr))
        }
      }
      const total = chunks.reduce((n, c) => n + c.byteLength, 0)
      const merged = new Uint8Array(total)
      let offset = 0
      for (const c of chunks) { merged.set(c, offset); offset += c.byteLength }
      text = new TextDecoder().decode(merged)
      console.log('paga-collect /banks response', {
        attempt,
        status: res.status,
        contentType: res.headers.get('content-type'),
        contentLength: res.headers.get('content-length'),
        bytes: total,
        body: text.slice(0, 800),
      })
      lastErr = null
      break
    } catch (err) {
      lastErr = err
      console.error('paga-collect /banks fetch failed', { attempt, error: String((err as any)?.message ?? err) })
      await new Promise((r) => setTimeout(r, 400 * attempt))
    }
  }
  if (lastErr) {
    return json({ error: `Upstream fetch failed: ${String((lastErr as any)?.message ?? lastErr)}` }, 502)
  }
  let data: any
  try { data = JSON.parse(text) } catch { data = { raw: text } }

  if (!res!.ok || (data?.statusCode !== undefined && String(data.statusCode) !== '0')) {
    const egressIp = await getEgressIp()
    const pagaMessage = data?.statusMessage || data?.message || data?.raw || `Paga HTTP ${res.status}`
    return json({
      error: `${pagaMessage}. If your Paga account is verified, ask Paga to whitelist this server IP for Collect/Direct Debit: ${egressIp || 'unavailable'}.`,
      status: res!.status,
      raw: data,
      diagnosis: { egress_ip: egressIp, hint: 'Paga /banks returns system error when the live merchant account is not enabled for Collect/Direct Debit or the server IP is not whitelisted.' },
    }, 200)
  }

  const rawBanks = Array.isArray(data)
    ? data
    : (Array.isArray(data?.banks) ? data.banks
      : Array.isArray(data?.bank) ? data.bank
      : Array.isArray(data?.data) ? data.data : [])

  const banks = rawBanks
    .map((b: any) => ({ uuid: b.uuid || b.bankId || b.id || b.code || '', name: b.name || b.bankName || '' }))
    .filter((b: any) => b.uuid && b.name)
    .sort((a: any, b: any) => a.name.localeCompare(b.name))

  return json({ banks })
}

async function handleMandate(body: any) {
  const { publicKey, secretKey, hmacKey } = getKeys()
  if (!publicKey || !secretKey || !hmacKey) {
    return json({ error: 'Paga credentials not configured' }, 503)
  }

  const {
    amount,
    currency = 'NGN',
    accountReference: incomingAccountRef,
    referenceNumber: incomingRef,
    isSingleUse = false,
    isAllowPartialPayments = true,
    payerCollectionFeeShare = 0.0,
    payeeCollectionFeeShare = 1.0,
    expiryDateTimeUTC: incomingExpiry,
    callBackUrl,
    payer,
    payee,
  } = body || {}

  // Validate required fields.
  const missing: string[] = []
  if (!amount || Number(amount) <= 0) missing.push('amount')
  if (!payer || typeof payer !== 'object') missing.push('payer')
  if (payer) {
    if (!payer.name) missing.push('payer.name')
    if (!payer.phoneNumber) missing.push('payer.phoneNumber')
    if (!payer.email) missing.push('payer.email')
    if (!payer.bankId) missing.push('payer.bankId')
    if (!payer.bankAccountNumber) missing.push('payer.bankAccountNumber')
  }
  if (!payee || !payee.name) missing.push('payee.name')
  if (missing.length) return json({ error: `Missing: ${missing.join(', ')}` }, 400)

  const referenceNumber = incomingRef || newReference('MAND')
  const accountReference = incomingAccountRef || newReference('LOCM')
  const expiryDateTimeUTC = incomingExpiry
    || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '')

  const payload = {
    referenceNumber,
    amount: Number(amount),
    currency,
    accountReference,
    isSingleUse,
    payer: {
      name: String(payer.name).trim(),
      phoneNumber: String(payer.phoneNumber).trim(),
      email: String(payer.email).trim(),
      address: payer.address ? String(payer.address).trim() : undefined,
      bankId: String(payer.bankId).trim(),
      bankAccountNumber: String(payer.bankAccountNumber).replace(/[^0-9]/g, ''),
    },
    payee: { name: String(payee.name).trim() },
    expiryDateTimeUTC,
    payerCollectionFeeShare,
    payeeCollectionFeeShare,
    isAllowPartialPayments,
    callBackUrl,
    paymentMethods: ['DIRECT_DEBIT'],
  }

  // Paga Direct Debit hash spec:
  // SHA-512(referenceNumber + amount + currency + payer.phoneNumber + payer.email + hashKey)
  const hash = await sha512Hex(`${referenceNumber}${payload.amount}${currency}${payload.payer.phoneNumber}${payload.payer.email}${hmacKey}`)
  const url = `${PAGA_BASE}/paymentRequest`
  const safePayload = {
    ...payload,
    payer: { ...payload.payer, bankAccountNumber: '****' + payload.payer.bankAccountNumber.slice(-4) },
  }
  console.log('paga-collect /mandate request', { url, payload: safePayload })

  let res: Response
  let text = ''
  let lastErr: unknown = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'identity',
          'User-Agent': 'Loca8tor-Edge/1.0',
          Connection: 'close',
          Authorization: basicAuth(publicKey, secretKey),
          hash,
        },
        body: JSON.stringify(payload),
      })
      const reader = res.body?.getReader()
      const chunks: Uint8Array[] = []
      if (reader) {
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
          }
        } catch (streamErr) {
          console.warn('paga-collect /mandate stream ended with error, using partial body', String((streamErr as any)?.message ?? streamErr))
        }
      }
      const total = chunks.reduce((n, c) => n + c.byteLength, 0)
      const merged = new Uint8Array(total)
      let offset = 0
      for (const c of chunks) { merged.set(c, offset); offset += c.byteLength }
      text = new TextDecoder().decode(merged)
      console.log('paga-collect /mandate response', { attempt, status: res.status, bytes: total, body: text.slice(0, 800) })
      lastErr = null
      break
    } catch (err) {
      lastErr = err
      console.error('paga-collect /mandate fetch failed', { attempt, error: String((err as any)?.message ?? err) })
      await new Promise((r) => setTimeout(r, 400 * attempt))
    }
  }
  if (lastErr) {
    return json({ error: `Upstream fetch failed: ${String((lastErr as any)?.message ?? lastErr)}` }, 502)
  }
  let data: any
  try { data = JSON.parse(text) } catch { data = { raw: text } }

  const statusCode = String(data?.statusCode ?? data?.responseCode ?? '')
  const ok = res!.ok && statusCode === '0'

  const directDebit = Array.isArray(data?.paymentMethods)
    ? data.paymentMethods.find((m: any) => m?.name === 'DIRECT_DEBIT')
    : null
  const activation = directDebit?.properties || {}

  if (!ok) {
    return json({
      error: data?.statusMessage || data?.message || data?.raw || `Paga HTTP ${res!.status}`,
      status: res!.status,
      raw: data,
    }, 200)
  }

  return json({
    referenceNumber,
    accountReference,
    expiryDateTimeUTC: data?.expiryDateTimeUTC || expiryDateTimeUTC,
    activation: {
      amount: activation.activationAmount || null,
      accountNumber: activation.activationAccountNumber || null,
      bankName: activation.activationBankName || null,
    },
    raw: data,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { publicKey, secretKey, hmacKey } = getKeys()
    console.log('paga-collect env check', {
      PAGA_PUBLIC_KEY: Boolean(publicKey),
      PAGA_SECRET_KEY: Boolean(secretKey),
      PAGA_HMAC_KEY: Boolean(hmacKey),
    })

    const body = await req.json().catch(() => ({} as any))
    const operation = String(body?.operation || '').trim()
    console.log('paga-collect operation', operation)

    if (operation === 'getBanks') return await handleBanks()
    if (operation === 'createMandate') return await handleMandate(body)

    return json({ error: "Missing 'operation'. Use 'getBanks' or 'createMandate'." }, 400)
  } catch (e) {
    console.error('paga-collect error', e)
    return json({ error: String((e as any)?.message ?? e) }, 500)
  }
})