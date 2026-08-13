import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const auth = req.headers.get('Authorization') ?? ''
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  )
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: userRes } = await userClient.auth.getUser()
  const user = userRes?.user
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })

  const { subscription_id } = await req.json().catch(() => ({}))
  if (!subscription_id) return new Response(JSON.stringify({ error: 'subscription_id required' }), { status: 400, headers: corsHeaders })

  const { error } = await admin.from('subscriptions').update({
    auto_renew: false, status: 'cancelled', cancelled_at: new Date().toISOString(),
  }).eq('id', subscription_id).eq('user_id', user.id)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})