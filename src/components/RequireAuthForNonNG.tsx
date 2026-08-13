import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Loader2, Lock, MailCheck, Bike, Crown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserAccess } from '@/hooks/useUserAccess';
import { toast } from '@/hooks/use-toast';
import { ensureRiderProfileFromMetadata, getSignupRedirectUrl } from '@/lib/authProfile';

/**
 * Auth gate for protected features. Requires every visitor to be signed in.
 * When `requireVerified` is true (e.g. the Quiz / payouts), the user must
 * also have a confirmed email address.
 * Super admins and preview/sandbox sessions pass through for testing.
 */
export default function RequireAuthForNonNG({
  children,
  requireVerified = false,
  requireRoles,
  requirePaid = false,
  allowPaused = false,
}: {
  children: React.ReactNode;
  requireVerified?: boolean;
  /** When set, only accounts whose rider.account_type is in this list may pass. */
  requireRoles?: Array<'individual' | 'rider' | 'business'>;
  /** When true, the rider/business must have an active or trialing subscription. */
  requirePaid?: boolean;
  /** When true, paused accounts may still access this route (used by /billing). */
  allowPaused?: boolean;
}) {
  const { ready, isSuperAdmin, isPreview } = useUserAccess();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [accountType, setAccountType] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [effectiveStatus, setEffectiveStatus] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [resending, setResending] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const loadRole = (u?: any) => {
      const uid = u?.id;
      if (!uid) { setAccountType(null); setSubStatus(null); setEffectiveStatus(null); setIsLinked(false); return; }
      supabase.from('riders').select('account_type, subscription_status').eq('user_id', uid).maybeSingle()
        .then(async ({ data }) => {
          if (cancelled) return;
          const profile = data || await ensureRiderProfileFromMetadata(u).catch(() => null);
          if (cancelled) return;
          setAccountType((profile?.account_type as string) ?? null);
          setSubStatus((profile?.subscription_status as string) ?? null);
        });
      (supabase as any).rpc('get_effective_subscription_status', { p_user_id: uid })
        .then(({ data }: any) => {
          if (cancelled) return;
          const row = Array.isArray(data) ? data[0] : data;
          setEffectiveStatus((row?.effective_status as string) ?? null);
          setIsLinked(!!row?.is_linked);
        });
    };
    const applyUser = (u: any) => {
      setIsAuthed(!!u);
      setEmail(u?.email ?? '');
      setEmailVerified(!!(u?.email_confirmed_at || u?.confirmed_at));
      loadRole(u);
    };
    // getSession reads from local storage — no network hang on refresh.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      applyUser(session?.user || null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      applyUser(session?.user || null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  if (!ready || !authChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Super admins + preview env: bypass for testing
  if (isSuperAdmin || isPreview) return <>{children}</>;

  // Signed in (and verified if required): allow, subject to role check
  if (isAuthed && (!requireVerified || emailVerified)) {
    if (requireRoles && requireRoles.length > 0) {
      if (!accountType || !requireRoles.includes(accountType as any)) {
        return (
        <div className="min-h-[70vh] flex items-center justify-center px-5">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Bike className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold tracking-tight">Riders & Businesses only</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Postcode search is reserved for rider and business accounts. Upgrade your account type to continue.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link to="/signup" className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm hover:brightness-110 transition-all">
                Create a Rider or Business account
              </Link>
              <Link to="/" className="w-full py-2.5 bg-secondary border border-border rounded-lg font-semibold text-sm hover:border-primary/40 transition-all">
                Back to home
              </Link>
            </div>
          </div>
        </div>
        );
      }
    }
    // Hard-block paused accounts (failed payment) on ANY gated route.
    // /billing remains accessible because it does not wrap itself with this gate when paused.
    if (effectiveStatus === 'paused' && !allowPaused) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-5">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold tracking-tight">Account paused</h1>
              <p className="text-sm text-muted-foreground mt-2">
                {isLinked
                  ? "Your business's last payment failed. Ask your business owner to retry billing — your rider account will reactivate automatically."
                  : 'Your last subscription payment failed. Retry billing to reactivate your account.'}
              </p>
            </div>
            <Link to="/billing" className="block w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm hover:brightness-110 transition-all">
              Go to billing
            </Link>
          </div>
        </div>
      );
    }
    if (requirePaid) {
      // Businesses always require a paid plan.
      // Individual riders/drivers NOT linked to a business also require a personal plan
      // (linked riders inherit the business's subscription via is_linked).
      const needsPaid =
        accountType === 'business' ||
        (accountType === 'rider' && !isLinked);
      const paid =
        (!!subStatus && ['active', 'trialing', 'trial'].includes(subStatus)) ||
        (!!effectiveStatus && ['active', 'trialing', 'trial'].includes(effectiveStatus));
      if (needsPaid && !paid && location.pathname !== '/onboarding/billing') {
        return <Navigate to="/onboarding/billing" replace state={{ from: location.pathname }} />;
      }
    }
    return <>{children}</>;
  }

  // Signed in but email not verified — prompt verification
  if (isAuthed && requireVerified && !emailVerified) {
    const resend = async () => {
      if (!email) return;
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: getSignupRedirectUrl() },
      });
      setResending(false);
      if (error) toast({ title: 'Could not send email', description: error.message, variant: 'destructive' });
      else toast({ title: 'Verification email sent', description: `Check ${email}` });
    };
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-5">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <MailCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">Verify your email</h1>
            <p className="text-sm text-muted-foreground mt-2">
              We sent a verification link to <span className="font-semibold text-foreground">{email}</span>.
              Confirm your email to play the quiz and request payouts.
            </p>
          </div>
          <button
            onClick={resend}
            disabled={resending}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm hover:brightness-110 transition-all disabled:opacity-60"
          >
            {resending ? 'Sending…' : 'Resend verification email'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-secondary border border-border rounded-lg font-semibold text-sm hover:border-primary/40 transition-all"
          >
            I&apos;ve verified — refresh
          </button>
        </div>
      </div>
    );
  }

  const redirect = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Sign in to continue</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Create a free account to use Loca8tor — generate postcodes, play the quiz, search and earn.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            to={`/signup?redirect=${redirect}`}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm hover:brightness-110 transition-all"
          >
            Create free account
          </Link>
          <Link
            to={`/login?redirect=${redirect}`}
            className="w-full py-2.5 bg-secondary border border-border rounded-lg font-semibold text-sm hover:border-primary/40 transition-all"
          >
            I already have an account
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Free forever. No credit card required.
        </p>
      </div>
    </div>
  );
}