import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Copy, Share2, Gift, Users, Wallet, ArrowLeft, CheckCircle2, Loader2, Phone, Wifi, Smartphone, Zap, MessageSquare, Lock, ShieldCheck, Mail } from 'lucide-react';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/deviceId';
import { debitBalance, getReferralHistory } from '@/lib/deviceReferral';
import { getMyUserReferralBalance, debitUserBalance, migrateDeviceBalanceToUser, type UserReferralBalance } from '@/lib/userReferral';
import { toast } from 'sonner';

const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];

function autoFormatPostcode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  if (/\s/.test(clean)) return clean;
  const match = clean.match(/^([A-Z]{1,3}\d)(\d[A-Z0-9]*)$/);
  if (match) return `${match[1]} ${match[2]}`;
  return clean;
}

interface ReferralAccount {
  id: string;
  device_id: string;
  referral_code: string;
  balance: number;
  total_earned: number;
  total_referrals: number;
}

export default function Refer() {
  const [account, setAccount] = useState<ReferralAccount | null>(null);
  const [userAccount, setUserAccount] = useState<UserReferralBalance | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requireAuth, setRequireAuth] = useState(false);
  const [view, setView] = useState<'dashboard' | 'withdraw'>('dashboard');
  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [businessReferrals, setBusinessReferrals] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Force every visitor (old or new) to sign up / sign in before viewing referral details
        setRequireAuth(true);
        return;
      }
      {
        setUserId(user.id);
        setUserEmail(user.email || '');
        // Make sure any device balance is migrated, then fetch the user balance row
        await migrateDeviceBalanceToUser(user.id).catch(() => {});
        const userBal = await getMyUserReferralBalance();
        setUserAccount(userBal);
        const { data: rider } = await supabase.from('riders').select('full_name').eq('user_id', user.id).maybeSingle();
        setUserName(rider?.full_name || '');
        if (userBal?.referral_code) {
          const history = await getReferralHistory(userBal.referral_code);
          setRecentClaims(history);
        }
        // Detailed referred-business info (status + ETA) via SECURITY DEFINER RPC
        const { data: businessRefs } = await (supabase as any).rpc('get_my_business_referrals');
        setBusinessReferrals((businessRefs as any[]) || []);
      }
    } catch (e: any) {
      toast.error('Could not load referral account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Live-update referral balance & history when the backend changes,
  // so users don't need to refresh to see new credits.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`refer-live-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_referral_balances' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_referral_claims' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_referrals' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  if (requireAuth) {
    return <Navigate to="/login?redirect=/refer" replace />;
  }

  const referralCode = userAccount?.referral_code ?? account?.referral_code ?? '';
  const balance = userAccount?.balance ?? account?.balance ?? 0;
  const totalEarned = userAccount?.total_earned ?? account?.total_earned ?? 0;
  const totalReferrals = userAccount?.total_referrals ?? account?.total_referrals ?? 0;
  const shareLink = referralCode
    ? `${window.location.origin}/?ref=${referralCode}`
    : '';

  const copyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast.success('Code copied!');
  };

  const shareNow = () => {
    if (!referralCode) return;
    const message = `Turn addresses into accurate Loca8tor postcodes, or refer a logistics business and earn ₦2,000 after they subscribe and complete their first delivery 🇳🇬🇬🇧🇺🇸🇨🇦\nUse my link:`;
    const text = `${message}\n${shareLink}`;
    if (navigator.share) {
      // Pass `url` separately and keep `text` link-free so share targets
      // (WhatsApp, SMS, etc.) don't render the referral link twice.
      navigator.share({ title: 'Loca8tor', text: message, url: shareLink }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Share link copied!');
    }
  };

  const shareViaSMS = () => {
    if (!referralCode) return;
    // Build the message with real newlines, then encode. iOS uses `&body=`,
    // Android historically used `?body=` — modern Android also accepts `&body=`,
    // but to be safe we sniff and pick the right separator.
    const message = `Turn addresses into accurate Loca8tor postcodes, or refer a logistics business and earn ₦2,000 after they subscribe and complete their first delivery 🇳🇬🇬🇧🇺🇸🇨🇦\n\nUse my link:\n${shareLink}`;
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const separator = isIOS ? '&' : '?';
    // %0A is the URL-encoded newline that SMS apps render as a real line break
    const encoded = encodeURIComponent(message).replace(/%5Cn/g, '%0A');
    window.location.href = `sms:${separator}body=${encoded}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (view === 'withdraw') {
    return (
      <WithdrawView
        balance={balance}
        isLoggedIn={!!userId}
        prefillName={userName}
        onBack={() => setView('dashboard')}
        onSuccess={load}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Refer & Earn ₦100 — Loca8tor" description="Share Loca8tor with friends, riders and logistics companies. Earn ₦100 per referral and withdraw as airtime or data." />
      <div className="max-w-xl mx-auto p-4 space-y-5">
        <div className="flex items-center gap-3 pt-2">
          <Link to="/" className="p-2 rounded-lg hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-heading text-2xl font-black text-foreground">Refer & Earn</h1>
            <p className="text-xs text-muted-foreground">
              {userId ? 'Signed in · Balance follows your account' : 'Linked to this device · Sign in to lock in your balance'}
            </p>
          </div>
        </div>

        {!userId && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Lock in your ₦{balance} balance</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Anonymous balances reset if your browser data is cleared. Sign up free to save it permanently and use it across devices.
              </p>
              <div className="flex gap-2 mt-2.5">
                <Link to="/signup" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Sign up free</Link>
                <Link to="/login" className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold">Sign in</Link>
              </div>
            </div>
          </div>
        )}
        {userId && userAccount?.migrated_from_device_id && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-foreground">Your previous device balance has been transferred to your account.</p>
          </div>
        )}

        {userId && userEmail && (
          <button
            onClick={async () => {
              setResendingEmail(true);
              try {
                const { data, error } = await supabase.functions.invoke('send-resend-email', {
                  body: { to: userEmail, type: 'welcome', name: userName || 'there' },
                });
                if (error || (data && data.success === false)) {
                  toast.error('Could not resend welcome email. Try again later.');
                } else {
                  toast.success(`Welcome email sent to ${userEmail}`);
                }
              } catch {
                toast.error('Could not resend welcome email.');
              } finally {
                setResendingEmail(false);
              }
            }}
            disabled={resendingEmail}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-secondary border border-border rounded-xl text-xs font-bold text-foreground hover:border-primary/40 transition-colors disabled:opacity-60"
          >
            {resendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-primary" />}
            {resendingEmail ? 'Sending…' : 'Resend welcome email'}
          </button>
        )}

        {/* Hero card */}
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-foreground">Your Referral Code</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-background border border-border rounded-lg px-4 py-3 font-mono text-xl font-black text-primary text-center tracking-widest">
              {referralCode}
            </div>
            <button onClick={copyCode} className="p-3 bg-background border border-border rounded-lg hover:border-primary/40 transition-colors">
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <button onClick={shareNow} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm active:scale-[0.98] transition-transform">
            <Share2 className="w-4 h-4" /> Share & Earn
          </button>

          <button onClick={shareViaSMS} className="w-full flex items-center justify-center gap-2 py-2.5 bg-background border border-border rounded-lg font-heading font-bold text-xs text-foreground hover:border-primary/40 transition-colors">
            <MessageSquare className="w-4 h-4 text-primary" /> Send as SMS / Text Message
          </button>

          <p className="text-[11px] text-muted-foreground text-center">
            Earn from normal referrals when users generate postcodes, or <span className="font-bold text-primary">₦2,000</span> when a referred business completes the required steps.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary border border-border rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Balance</p>
            <p className="font-heading text-xl font-black text-primary">₦{balance}</p>
          </div>
          <div className="bg-secondary border border-border rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Referrals</p>
            <p className="font-heading text-xl font-black text-foreground">{totalReferrals}</p>
          </div>
          <div className="bg-secondary border border-border rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Earned</p>
            <p className="font-heading text-xl font-black text-foreground">₦{totalEarned}</p>
          </div>
        </div>

        {/* Withdraw button */}
        <button
          onClick={() => setView('withdraw')}
          disabled={balance < 50}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-foreground text-background rounded-xl font-heading font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          <Wallet className="w-4 h-4" />
          {balance >= 50 ? `Withdraw ₦${balance} as Airtime/Data` : 'Need ₦50 minimum to withdraw'}
        </button>

        {/* Recent claims */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Referral History
          </p>
          {recentClaims.length === 0 ? (
            <div className="bg-secondary border border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">No referrals yet</p>
              <p className="text-[11px] text-muted-foreground mt-1">Share your link to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentClaims.map(c => {
                const dt = new Date(c.created_at);
                const triggerLabel = c.trigger_event === 'postcode_generated'
                  ? 'Generated postcode'
                  : c.trigger_event.replace(/_/g, ' ');
                return (
                  <div key={c.id} className="bg-secondary border border-border rounded-xl p-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground font-mono truncate">
                          Device {c.referred_device_short}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Zap className="w-2.5 h-2.5" /> {triggerLabel}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-primary">+₦{c.amount}</p>
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {c.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-muted/40 border border-border rounded-xl p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">How it works</p>
          <p>1. Share your link with friends, riders and logistics companies</p>
          <p>2. They open it and generate a postcode</p>
          <p>3. ₦100 lands in your balance instantly</p>
          <p>4. Withdraw as airtime or data once you hit ₦50</p>
        </div>

        {/* Bigger reward for referring logistics companies */}
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-foreground">Refer a Logistics Business — Earn ₦2,000</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Send the same link to a logistics business. When they sign up as a
            <span className="font-semibold text-foreground"> Business</span> account using your code, you'll earn
            <span className="font-bold text-primary"> ₦2,000</span> — paid into this balance once they complete both:
          </p>
          <ol className="text-xs text-muted-foreground space-y-1 pl-1">
            <li>1. ✅ Sign up &amp; fund wallet with your referral link</li>
            <li>2. ✅ Finish the 7-day trial and activate a paid subscription</li>
          </ol>
          <p className="text-[11px] text-muted-foreground">
            Use the same Share button above — the link works for both friends (₦100) and business referrals (₦2,000).
          </p>
        </div>

        {businessReferrals.length > 0 && (
          <div className="bg-secondary border border-border rounded-2xl p-5 space-y-3">
            <p className="font-heading font-bold text-foreground flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" /> Business Referral Progress
            </p>
            <div className="space-y-3">
              {businessReferrals.map((r) => {
                const steps = [
                  { label: 'Signed up', done: !!r.signup_at },
                  { label: 'Started 7-day trial', done: !!r.subscribed_at || r.referred_subscription_status === 'trialing' || r.referred_subscription_status === 'trial' || r.referred_subscription_status === 'active' },
                  { label: 'Paid subscription (post-trial)', done: r.status === 'credited' },
                ];
                const done = steps.filter((s) => s.done).length;
                const eta = r.expected_credit_at ? new Date(r.expected_credit_at) : null;
                const missing = steps.filter((s) => !s.done).map((s) => s.label).join(' · ') || 'awaiting credit';
                const credited = r.status === 'credited';
                return (
                  <div key={r.id} className="bg-background border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-heading font-bold text-foreground truncate">
                          {r.referred_business_name || r.referred_email || 'Business referral'}
                        </p>
                        {r.referred_email && r.referred_business_name && (
                          <p className="text-[10px] text-muted-foreground truncate">{r.referred_email}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {credited ? '+₦2,000 credited' : `${done}/${steps.length} done`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {steps.map((s) => (
                        <div key={s.label} className={`rounded-lg px-2 py-2 text-center text-[10px] font-semibold leading-tight ${s.done ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {s.done ? '✓ ' : '○ '}{s.label}
                        </div>
                      ))}
                    </div>
                    {credited ? (
                      <p className="text-[10px] text-primary font-semibold">
                        ✓ Credited on {new Date(r.credited_at).toLocaleString()}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground">Missing:</span> {missing}
                        </p>
                        {eta ? (
                          <p className="text-[10px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Expected credit:</span>{' '}
                            {eta.toLocaleDateString()} · {eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="text-muted-foreground"> (when the 7-day trial ends &amp; first paid renewal goes through)</span>
                          </p>
                        ) : r.status === 'pending' ? (
                          <p className="text-[10px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Expected credit:</span> as soon as they fund their wallet and activate their plan.
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Expected credit:</span> shortly after their first paid subscription posts.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
              ₦2,000 lands in your balance the moment the business completes their 7-day trial and moves to an active paid subscription. You'll get an in-app alert and email the second it credits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function WithdrawView({ balance, isLoggedIn, prefillName, onBack, onSuccess }: { balance: number; isLoggedIn: boolean; prefillName: string; onBack: () => void; onSuccess: () => void }) {
  const [type, setType] = useState<'airtime' | 'data'>('airtime');
  const [fullName, setFullName] = useState(prefillName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [network, setNetwork] = useState('');
  const [postcode, setPostcode] = useState('');
  const [amount, setAmount] = useState(String(balance));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [postcodeStatus, setPostcodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [postcodeError, setPostcodeError] = useState<string>('');

  // Strict global postcode shape: 1-3 letters + digit + space + digit + 1-3 alphanum
  const POSTCODE_RE = /^[A-Z]{1,3}\d[A-Z0-9]?\s\d[A-Z0-9]{1,3}$/;

  useEffect(() => {
    const value = postcode.trim();
    if (!value) {
      setPostcodeStatus('idle');
      setPostcodeError('');
      return;
    }
    if (!POSTCODE_RE.test(value)) {
      setPostcodeStatus('invalid');
      setPostcodeError('Format must be uppercase with a space (e.g. ED9 1AA)');
      return;
    }
    let cancelled = false;
    setPostcodeStatus('checking');
    setPostcodeError('');
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('postcodes')
        .select('postcode')
        .ilike('postcode', value)
        .limit(1);
      if (cancelled) return;
      if (error) {
        setPostcodeStatus('invalid');
        setPostcodeError('Could not verify postcode. Try again.');
        return;
      }
      if (!data || data.length === 0) {
        setPostcodeStatus('invalid');
        setPostcodeError('This postcode was not generated by Loca8tor');
        return;
      }
      setPostcodeStatus('valid');
      setPostcodeError('');
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [postcode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!fullName.trim()) return toast.error('Enter your full name');
    if (!/^0[7-9]\d{9}$/.test(phone.trim())) return toast.error('Enter a valid Nigerian phone (e.g. 08012345678)');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error('Enter a valid email');
    if (!network) return toast.error('Select a network');
    if (!postcode.trim()) return toast.error('Enter your generated postcode');
    if (postcodeStatus !== 'valid') return toast.error(postcodeError || 'Enter a valid generated postcode');
    if (!amt || amt < 50) return toast.error('Minimum ₦50');
    if (amt > balance) return toast.error('Amount exceeds your balance');

    setSubmitting(true);

    const formattedPostcode = autoFormatPostcode(postcode.trim());

    // Debit first (atomic server-side check) — use the right balance source.
    // Wrap in try/catch so an unexpected RPC failure (network, RLS, etc.)
    // doesn't leave the button stuck on "Processing…".
    let result: { success: boolean; error?: string } | null = null;
    try {
      result = isLoggedIn
        ? await debitUserBalance(amt)
        : await debitBalance(amt);
    } catch (err: any) {
      console.error('Debit failed', err);
      setSubmitting(false);
      return toast.error('Could not process withdrawal. Please try again.');
    }
    if (!result?.success) {
      setSubmitting(false);
      return toast.error(result?.error === 'insufficient_balance' ? 'Insufficient balance' : 'Could not process withdrawal');
    }

    // Record withdrawal
    const { error } = await supabase.from('withdrawals').insert({
      type,
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      network_provider: network,
      state_of_residence: 'Referral',
      address: `Referral payout · device ${getDeviceId().slice(0, 16)}`,
      postcode: formattedPostcode,
      amount: amt,
      status: 'pending',
      source: 'referral',
    });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to submit. Please try again.');
      return;
    }

    // Fire-and-forget confirmation email via Resend
    supabase.functions.invoke('send-resend-email', {
      body: {
        to: email.trim(),
        type: 'custom',
        subject: `Withdrawal received — ₦${amt} ${type}`,
        html: withdrawalEmailHtml({
          name: fullName.trim(),
          amount: amt,
          type,
          network,
          phone: phone.trim(),
          postcode: formattedPostcode,
        }),
      },
    }).catch(err => console.warn('Confirmation email failed', err));

    toast.success('Withdrawal submitted!');
    setDone(true);
    onSuccess();
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/15 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-black text-foreground">Withdrawal Submitted</h2>
            <p className="text-sm text-muted-foreground mt-1">Your {type} will be sent within 24 hours.</p>
          </div>
          <button onClick={onBack} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="font-heading text-xl font-black text-foreground">Withdraw Earnings</h1>
            <p className="text-xs text-muted-foreground">Balance: ₦{balance}</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3 bg-card border border-border rounded-2xl p-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button type="button" onClick={() => setType('airtime')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-bold ${type==='airtime' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground'}`}>
                <Phone className="w-4 h-4" /> Airtime
              </button>
              <button type="button" onClick={() => setType('data')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-bold ${type==='data' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground'}`}>
                <Wifi className="w-4 h-4" /> Data
              </button>
            </div>
          </div>

          <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Jane Doe" />
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="08012345678" type="tel" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Postcode</label>
            <input
              value={postcode}
              onChange={e => setPostcode(autoFormatPostcode(e.target.value))}
              placeholder="ED9 1AA"
              maxLength={10}
              className={`mt-1.5 w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 ${
                postcodeStatus === 'invalid' ? 'border-destructive focus:ring-destructive/30' :
                postcodeStatus === 'valid' ? 'border-primary focus:ring-primary/30' :
                'border-border focus:ring-primary/30'
              }`}
            />
            <div className="mt-1 min-h-[16px] text-[11px]">
              {postcodeStatus === 'checking' && <span className="text-muted-foreground">Checking…</span>}
              {postcodeStatus === 'valid' && <span className="text-primary font-semibold">✓ Valid generated postcode</span>}
              {postcodeStatus === 'invalid' && <span className="text-destructive">{postcodeError}</span>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Network</label>
            <select value={network} onChange={e => setNetwork(e.target.value)}
              className="mt-1.5 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">Select network</option>
              {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <Field label={`Amount (max ₦${balance})`} value={amount} onChange={setAmount} placeholder="50" type="number" />

          <button type="submit" disabled={submitting || postcodeStatus !== 'valid'}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
            {submitting ? 'Processing…' : `Withdraw ₦${amount || 0}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function withdrawalEmailHtml(d: { name: string; amount: number; type: string; network: string; phone: string; postcode: string }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#e5e5e5;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
      <h1 style="text-align:center;font-size:24px;color:#b8f53a;margin:0 0 24px;">LOCA<span style="color:#fff;">8</span>TOR</h1>
      <div style="background:#141414;border:1px solid #262626;border-radius:16px;padding:28px;">
        <h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Hi ${d.name}, we've received your withdrawal 🎉</h2>
        <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 16px;">
          Your <strong style="color:#b8f53a;">₦${d.amount}</strong> ${d.type} request is now pending. We'll send it to your ${d.network} line within 24 hours.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#737373;font-size:13px;">Type</td><td style="padding:6px 0;color:#fff;font-size:13px;text-align:right;text-transform:capitalize;">${d.type}</td></tr>
          <tr><td style="padding:6px 0;color:#737373;font-size:13px;">Network</td><td style="padding:6px 0;color:#fff;font-size:13px;text-align:right;">${d.network}</td></tr>
          <tr><td style="padding:6px 0;color:#737373;font-size:13px;">Phone</td><td style="padding:6px 0;color:#fff;font-size:13px;text-align:right;">${d.phone}</td></tr>
          <tr><td style="padding:6px 0;color:#737373;font-size:13px;">Postcode</td><td style="padding:6px 0;color:#b8f53a;font-size:13px;text-align:right;font-family:monospace;">${d.postcode}</td></tr>
        </table>
        <p style="color:#737373;font-size:12px;margin:16px 0 0;">If you didn't request this, reply immediately.</p>
      </div>
      <p style="text-align:center;color:#525252;font-size:12px;margin-top:24px;">© Loca8tor · Workerholics Solutions Ltd</p>
    </div>
  </body></html>`;
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
        className="mt-1.5 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}