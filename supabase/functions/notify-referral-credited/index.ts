// Sends a "₦2,000 credited" email to the referrer when their referred
// business completes their first paid subscription. Invoked by a DB trigger
// via pg_net using the service-role bearer token.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
const FROM = 'Loca8tor <onboarding@resend.dev>';

function html(name: string, referredEmail: string | null, amount: number) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#e5e5e5;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
      <h1 style="text-align:center;font-size:26px;color:#b8f53a;margin:0 0 24px;">LOCA<span style="color:#fff;">8</span>TOR</h1>
      <div style="background:#141414;border:1px solid #262626;border-radius:16px;padding:32px;">
        <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">You just earned ₦${amount.toLocaleString()} 🎉</h2>
        <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 14px;">
          Hi ${name}, the business you referred${referredEmail ? ` (<strong style="color:#fff;">${referredEmail}</strong>)` : ''} just activated their paid Loca8tor business subscription.
        </p>
        <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 22px;">
          <strong style="color:#b8f53a;">₦${amount.toLocaleString()}</strong> has been added to your Refer &amp; Win balance. You can withdraw it as airtime or data once your balance is ₦50 or more.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="https://loca8tor.com/refer" style="background:#b8f53a;color:#0a0a0a;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">View Refer &amp; Win →</a>
        </div>
      </div>
      <p style="text-align:center;color:#525252;font-size:12px;margin-top:24px;">© Loca8tor · Workerholics Solutions Ltd</p>
    </div>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
    if (auth !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, skipped: true, reason: 'resend_not_configured' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { referrer_email, referrer_name, referred_email, amount } = await req.json();
    if (!referrer_email) {
      return new Response(JSON.stringify({ error: 'referrer_email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const name = String(referrer_name || 'there').replace(/[<>]/g, '').slice(0, 100);
    const amt = Number(amount) || 2000;
    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [referrer_email],
        subject: `You earned ₦${amt.toLocaleString()} from a business referral 🎉`,
        html: html(name, referred_email || null, amt),
      }),
    });
    const data = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify({ success: resp.ok, data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'unknown' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});