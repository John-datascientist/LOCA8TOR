import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/loca8tor-logo-green.png';
import { migrateDeviceBalanceToUser } from '@/lib/userReferral';
import { ensureRiderProfileFromMetadata, getSignupRedirectUrl } from '@/lib/authProfile';
import SEO from '@/components/SEO';
import GoogleSignInButton from '@/components/GoogleSignInButton';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const verified = searchParams.get('verified') === '1';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Enter your email and password'); return; }
    setLoading(true);
    setError('');
    setNeedsVerification(false);
    setResent(false);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      const msg = authError.message || '';
      const isUnverified =
        /email not confirmed/i.test(msg) ||
        /not.*confirm/i.test(msg) ||
        /verify/i.test(msg);
      if (isUnverified) {
        setNeedsVerification(true);
        setError('Your email isn’t verified yet. Check your inbox for the verification link, or resend it below.');
      } else {
        setError(msg);
      }
      setLoading(false);
      return;
    }
    // Check user type and redirect
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Migrate any anonymous device balance into this account (idempotent)
      migrateDeviceBalanceToUser(user.id).catch(() => {});
      const ensured = await ensureRiderProfileFromMetadata(user).catch(() => null);
      const { data: freshRider } = await supabase.from('riders').select('account_type, worker_type, full_name, is_banned, ban_reason').eq('user_id', user.id).maybeSingle();
      const rider = freshRider || ensured;
      if (rider?.is_banned) {
        await supabase.auth.signOut();
        setError(
          `Your account has been banned${rider.ban_reason ? `: ${rider.ban_reason}` : '.'} ` +
          `If you believe this is a mistake, email support@loca8tor.com.`
        );
        setLoading(false);
        return;
      }
      // Send sign-in alert via Resend (non-blocking)
      supabase.functions.invoke('send-resend-email', {
        body: { to: email, type: 'login', name: rider?.full_name || 'there' },
      }).catch(err => console.error('Login email failed:', err));
      if (redirectParam) navigate(redirectParam);
      else if (rider?.account_type === 'business') navigate('/business');
      else if (
        (rider as any)?.account_type === 'rider' ||
        ['rider', 'driver'].includes(String((rider as any)?.worker_type || ''))
      ) navigate('/rider');
      else navigate('/refer');
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email) { setError('Enter your email above first'); return; }
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getSignupRedirectUrl() },
    });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setResent(true);
  };

  return (
    <>
    <SEO
      title="Sign In to Loca8tor — Postcode & Delivery Tools"
      description="Sign in to your Loca8tor account to generate postcodes, track deliveries, manage your rider or business dashboard, and access location-based tools."
      path="/login"
    />
    <div className="min-h-screen flex items-center justify-center px-5 py-20 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-[420px] bg-card border border-border rounded-2xl p-8 md:p-10 relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 font-heading text-lg font-black">
            <img src={logoImg} alt="Loca8tor" className="w-8 h-8 rounded-lg object-cover" />
            LOCA<span className="text-primary">8</span>TOR
          </Link>
          <h1 className="font-heading text-2xl font-extrabold mt-5">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {verified ? 'Email verified — sign in to continue' : 'Sign in to your account'}
          </p>
        </div>

        {verified && (
          <div className="mb-4 text-primary text-xs bg-primary/10 rounded-lg p-3 text-center font-semibold">
            Your email has been verified. Sign in to open your dashboard.
          </div>
        )}

        <div className="mb-4">
          <GoogleSignInButton label="Sign in with Google" />
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-4 py-3 pr-12 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground">
              <input type="checkbox" className="accent-primary" /> Remember me
            </label>
            <Link to="/reset-password" className="text-primary text-xs hover:underline">Forgot password?</Link>
          </div>

          {error && (
            <div className="text-destructive text-xs bg-destructive/10 rounded-lg p-3 text-center">{error}</div>
          )}

          {needsVerification && (
            <div className="text-xs bg-secondary border border-border rounded-lg p-3 space-y-2 text-center">
              {resent ? (
                <p className="text-primary font-semibold">
                  ✓ A new verification email has been sent to {email}.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="text-primary font-semibold hover:underline disabled:opacity-60"
                >
                  {resending ? 'Sending…' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In →
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Don't have an account? <Link to={redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : '/signup'} className="text-primary hover:underline font-semibold">Create one free</Link>
        </p>
      </div>
    </div>
    </>
  );
}
