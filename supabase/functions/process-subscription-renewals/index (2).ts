import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''
    const provided = req.headers.get('x-cron-secret') || ''
    const authHeader = req.headers.get('Authorization') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const isServiceRole = authHeader === `Bearer ${serviceKey}` && serviceKey.length > 0
    if (!CRON_SECRET || (provided !== CRON_SECRET && !isServiceRole)) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: dueSubs } = await admin
      .from('business_subscriptions')
      .select('id')
      .lte('next_renewal_at', new Date().toISOString())
      .eq('auto_renew', true)
      .in('status', ['active','past_due','trialing'])

    const { data: dueApiSubs } = await admin
      .from('api_subscriptions')
      .select('id')
      .lte('next_renewal_at', new Date().toISOString())
      .eq('auto_renew', true)
      .in('status', ['active','past_due'])

    const results: any[] = []
    for (const s of (dueSubs || [])) {
      const { data, error } = await admin.rpc('process_subscription_renewal', { _subscription_id: s.id })
      results.push({ id: s.id, kind: 'fleet', data, error: error?.message })
    }
    for (const s of (dueApiSubs || [])) {
      const { data, error } = await admin.rpc('process_api_subscription_renewal', { _subscription_id: s.id })
      results.push({ id: s.id, kind: 'api', data, error: error?.message })
    }
    return new Response(JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: corsHeaders })
  }
})