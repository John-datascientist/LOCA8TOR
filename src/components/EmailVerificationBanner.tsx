import { useEffect, useState } from 'react';
import { MailCheck, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Sticky banner shown to signed-in users whose email is not yet verified.
 * Includes resend button + clear instructions. Quiet (renders nothing) when
 * the user is signed-out, verified, or has dismissed it for this session.
 */
export default function EmailVerificationBanner() {
  const [email, setEmail] = useState<string | null>(null);
  const [verified, setVerified] = useState(true); // default hides until checked
  const [authChecked, setAuthChecked] = useState(false);
  const [resending, setResending] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('loca8tor:verify-banner-dismissed') === '1'; }
    catch { return false; }
  });

  useEffect(() => {
    let cancelled = false;
    const sync = (user: any) => {
      setEmail(user?.email ?? null);
      setVerified(!!(user?.email_confirmed_at || user?.confirmed_at));
    };
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      sync(data.user);
      setAuthChecked(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      sync(session?.user);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  if (!authChecked || !email || verified || dismissed) return null;

  const resend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) toast({ title: 'Could not send email', description: error.message, variant: 'destructive' });
    else toast({ title: 'Verification email sent', description: `Check ${email} (and your spam folder).` });
  };

  const dismiss = () => {
    try { sessionStorage.setItem('loca8tor:verify-banner-dismissed', '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <MailCheck className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-heading text-sm font-bold text-foreground">
          Verify your email to unlock the Quiz & withdrawals
        </p>
        <p className="text-[12px] text-muted-foreground leading-snug">
          We sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>.
          Open it on this device, then return here — the page will continue from where you left off.
          Don&apos;t see it? Check your spam folder or resend below.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1.5">
          <button
            onClick={resend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-heading font-bold px-3 py-1.5 rounded-md hover:brightness-110 transition-all disabled:opacity-60"
          >
            {resending && <Loader2 className="w-3 h-3 animate-spin" />}
            {resending ? 'Sending…' : 'Resend verification email'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1.5"
          >
            I&apos;ve verified — refresh
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}