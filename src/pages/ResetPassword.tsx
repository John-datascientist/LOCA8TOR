import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, Eye, EyeOff, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

const PASSWORD_RESET_REDIRECT_URL = 'https://www.loca8tor.com/reset-password';

const getRecoveryIndicators = () => {
  if (typeof window === 'undefined') {
    return { hasRecoveryType: false, hasRecoveryToken: false, recoveryCode: null, tokenHash: null, accessToken: null, refreshToken: null };
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);
  const recoveryCode = searchParams.get('code') || hashParams.get('code');
  const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
  const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

  const hasRecoveryType =
    hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';

  const hasRecoveryToken = ['access_token', 'refresh_token', 'token', 'token_hash', 'code'].some(
    (key) => hashParams.has(key) || searchParams.has(key)
  );

  return { hasRecoveryType, hasRecoveryToken, recoveryCode, tokenHash, accessToken, refreshToken };
};

const RECOVERY_FLAG_KEY = 'loca8tor:password-recovery';

// Capture indicators at module load, BEFORE supabase-js auto-processes and
// strips the URL hash. Without this, fast hash detection can race the client.
const INITIAL_INDICATORS = getRecoveryIndicators();
if (typeof window !== 'undefined' && (INITIAL_INDICATORS.hasRecoveryType || INITIAL_INDICATORS.hasRecoveryToken)) {
  try { sessionStorage.setItem(RECOVERY_FLAG_KEY, '1'); } catch {}
}

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  const [initialLinkHadRecoveryParams] = useState(() => {
    const { hasRecoveryType, hasRecoveryToken } = INITIAL_INDICATORS;
    const flagged = typeof window !== 'undefined' && sessionStorage.getItem(RECOVERY_FLAG_KEY) === '1';
    return hasRecoveryType || hasRecoveryToken || flagged;
  });

  useEffect(() => {
    let isMounted = true;

    const syncRecoveryState = async () => {
      const { hasRecoveryType, hasRecoveryToken, recoveryCode, tokenHash, accessToken, refreshToken } = getRecoveryIndicators();
      let { data: { session } } = await supabase.auth.getSession();

      if (!session && recoveryCode) {
        const { data } = await supabase.auth.exchangeCodeForSession(recoveryCode);
        session = data.session;
      }

      if (!session && accessToken && refreshToken) {
        const { data } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        session = data.session;
      }

      if (!session && tokenHash) {
        const { data } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        session = data.session;
      }

      if (!isMounted) return;

      const flagged = sessionStorage.getItem(RECOVERY_FLAG_KEY) === '1';
      const hasRecoveryHints = hasRecoveryType || hasRecoveryToken || initialLinkHadRecoveryParams || flagged;

      if (session && hasRecoveryHints) {
        sessionStorage.setItem(RECOVERY_FLAG_KEY, '1');
        setIsRecovery(true);
        setInvalidLink(false);
      } else if (hasRecoveryHints && !session) {
        setInvalidLink(true);
        setIsRecovery(false);
      }
      setCheckingLink(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        sessionStorage.setItem(RECOVERY_FLAG_KEY, '1');
        setIsRecovery(true);
        setInvalidLink(false);
        setCheckingLink(false);
      }
    });

    void syncRecoveryState();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initialLinkHadRecoveryParams]);

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      toast.error('Enter your email address');
      return;
    }

    setRequestLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setRequestSent(true);
      setInvalidLink(false);
      toast.success('Reset link sent. Check your email inbox.');
    }

    setRequestLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    toast.success('Password updated successfully.');
    sessionStorage.removeItem(RECOVERY_FLAG_KEY);
    setResetSuccess(true);
    setLoading(false);
  };

  if (checkingLink) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking reset link...
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-lg ring-1 ring-border p-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
            <h1 className="font-heading text-xl font-bold text-foreground">Password changed successfully</h1>
            <p className="text-sm text-muted-foreground">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <Mail className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="font-heading text-xl font-bold text-foreground">
              {requestSent ? 'Check your email' : 'Reset your password'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {requestSent
                ? `We sent a reset link to ${email.trim().toLowerCase()}. Open it to choose a new password.`
                : 'Enter the email linked to your account and we’ll send you a password reset link.'}
            </p>
          </div>

          <div className="bg-card rounded-lg ring-1 ring-border p-6 space-y-4">
            {invalidLink && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                This reset link is invalid or has expired. Request a fresh one below.
              </div>
            )}

            {requestSent ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setRequestSent(false)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Send another link
                </button>
                <Link to="/login" className="block text-center text-sm text-primary hover:underline">
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSendResetLink} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={requestLoading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                >
                  {requestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send reset link
                </button>
                <Link to="/login" className="block text-center text-sm text-primary hover:underline">
                  Back to sign in
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <Lock className="w-12 h-12 text-primary mx-auto mb-3" />
          <h1 className="font-heading text-xl font-bold text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your new password below</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4 bg-card rounded-lg ring-1 ring-border p-6">
          <div>
            <label className="text-xs font-medium text-foreground">New Password</label>
            <div className="relative mt-1">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm"
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Re-enter password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
