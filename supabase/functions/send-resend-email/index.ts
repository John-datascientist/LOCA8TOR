// Generic Resend email sender via Lovable connector gateway
// Used for welcome emails on signup and login notifications.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

type EmailType = 'welcome' | 'login';

interface RequestBody {
  to: string;
  type?: EmailType;
  name?: string;
}

const FROM_DEFAULT = 'Loca8tor <onboarding@resend.dev>';

function welcomeTemplate(name: string) {
  return {
    subject: `Welcome to Loca8tor, ${name}! 🎉`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#e5e5e5;">
      <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="font-size:28px;color:#b8f53a;margin:0;letter-spacing:-0.5px;">LOCA<span style="color:#fff;">8</span>TOR</h1>
        </div>
        <div style="background:#141414;border:1px solid #262626;border-radius:16px;padding:32px;">
          <h2 style="color:#fff;font-size:22px;margin:0 0 16px;">Hey ${name}, welcome aboard! 👋</h2>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Your Loca8tor account is ready. You can now generate global-format postcodes, share locations instantly, and manage deliveries — all from one place.
          </p>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 24px;">
            🎁 You're on a <strong style="color:#b8f53a;">7-day free trial</strong> with full access to every feature.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://loca8tor.com/login" style="background:#b8f53a;color:#0a0a0a;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">Get Started →</a>
          </div>
          <p style="color:#737373;font-size:13px;line-height:1.6;margin:24px 0 0;">Need help? Just reply to this email.</p>
        </div>
        <p style="text-align:center;color:#525252;font-size:12px;margin-top:24px;">© Loca8tor · Workerholics Solutions Ltd</p>
      </div>
    </body></html>`,
  };
}

function loginTemplate(name: string) {
  return {
    subject: 'New sign-in to your Loca8tor account',
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#e5e5e5;">
      <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
        <h1 style="text-align:center;font-size:24px;color:#b8f53a;margin:0 0 24px;">LOCA<span style="color:#fff;">8</span>TOR</h1>
        <div style="background:#141414;border:1px solid #262626;border-radius:16px;padding:28px;">
          <h2 style="color:#fff;font-size:18px;margin:0 0 12px;">Hi ${name}, you just signed in</h2>
          <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0;">
            We noticed a new sign-in to your account at ${new Date().toUTCString()}. If this was you, no action needed. If not, please reset your password immediately.
          </p>
          <div style="text-align:center;margin:24px 0 4px;">
            <a href="https://loca8tor.com/reset-password" style="background:#b8f53a;color:#0a0a0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Reset password</a>
          </div>
        </div>
      </div>
    </body></html>`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    // Require authenticated caller. Restrict recipient to caller's own email
    // to prevent abuse of our sending infrastructure for phishing/spam.
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    const callerEmail = claimsData?.claims?.email as string | undefined;
    if (claimsErr || !callerEmail) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RequestBody = await req.json();
    const type: EmailType = body.type === 'login' ? 'login' : 'welcome';

    // Enforce: only send to the authenticated caller's own email.
    const requestedTo = (body.to || '').trim().toLowerCase();
    if (requestedTo && requestedTo !== callerEmail.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Recipient must match authenticated user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const to = callerEmail;

    const name = (body.name || 'there').replace(/[<>]/g, '').slice(0, 100);
    let subject = '';
    let html = '';
    if (type === 'welcome') {
      const t = welcomeTemplate(name);
      subject = t.subject; html = t.html;
    } else {
      const t = loginTemplate(name);
      subject = t.subject; html = t.html;
    }

    if (!subject || !html) {
      return new Response(JSON.stringify({ error: 'Template render failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_DEFAULT,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      // Resend connector not linked / credential missing — don't surface a
      // 4xx/5xx to the client (these notifications are best-effort and must
      // never block sign-in or signup). Log and return 200 with skipped:true.
      console.warn('send-resend-email skipped', resp.status, data);
      return new Response(JSON.stringify({ success: false, skipped: true, error: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('send-resend-email skipped', msg);
    // Same here: never bubble up as a runtime error to the caller.
    return new Response(JSON.stringify({ success: false, skipped: true, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
