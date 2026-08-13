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
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const confirmation = String(body?.confirmation ?? '').trim().toUpperCase()
    if (confirmation !== 'DELETE') {
      return new Response(
        JSON.stringify({ error: 'confirmation_required', message: 'Type DELETE to confirm.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Best-effort clean up of app-owned rows before removing the auth user.
    // Most tables cascade via `on delete cascade` from auth.users, but a few
    // reference the user id without cascade. Ignore failures — the auth delete
    // is the authoritative step.
    const uid = user.id
    const cleanup = async (table: string, column = 'user_id') => {
      try { await admin.from(table).delete().eq(column, uid) } catch (e) { console.warn('cleanup', table, (e as any)?.message) }
    }
    await Promise.all([
      cleanup('riders'),
      cleanup('business_subscriptions', 'business_user_id'),
      cleanup('business_wallets', 'business_user_id'),
      cleanup('business_earnings', 'business_user_id'),
      cleanup('business_branding', 'business_user_id'),
      cleanup('subscriptions'),
      cleanup('subscription_payments'),
      cleanup('wallet_transactions'),
      cleanup('withdrawals'),
      cleanup('user_notifications'),
      cleanup('user_referral_balances'),
      cleanup('saved_postcodes'),
      cleanup('postcode_history'),
      cleanup('rider_join_requests', 'rider_user_id'),
      cleanup('rider_messages', 'rider_user_id'),
      cleanup('rider_shifts', 'rider_user_id'),
      cleanup('rider_delivery_logs', 'rider_user_id'),
      cleanup('emergency_contacts'),
      cleanup('quiz_play_log'),
      cleanup('quiz_balance_ledger'),
      cleanup('referrals', 'referred_user_id'),
      cleanup('mcp_postcode_lookups'),
      cleanup('contact_messages'),
    ])

    const { error: delErr } = await admin.auth.admin.deleteUser(uid)
    if (delErr) {
      return new Response(JSON.stringify({ error: 'delete_failed', message: delErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('delete-my-account', e)
    return new Response(JSON.stringify({ error: 'internal_error', message: (e as any)?.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
