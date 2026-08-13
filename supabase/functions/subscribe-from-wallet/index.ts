import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    )
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: u } = await userClient.auth.getUser()
    const user = u?.user
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })

    const body = await req.json().catch(() => ({}))
    const plan_code = String(body?.plan_code || '')
    const billing_cycle = String(body?.billing_cycle || 'monthly')
    if (!plan_code || !['monthly','quarterly','biannual','annual'].includes(billing_cycle)) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: corsHeaders })
    }

    const { data, error } = await admin.rpc('debit_wallet_for_subscription', {
      _user_id: user.id, _plan_code: plan_code, _cycle: billing_cycle,
    })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
    }
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders })
  }
})