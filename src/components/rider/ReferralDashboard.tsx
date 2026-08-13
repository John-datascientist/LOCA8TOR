import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Gift, Users, Share2, CheckCircle, ExternalLink, Wallet, ArrowRight, Loader2 } from 'lucide-react';
import { getMyUserReferralBalance, migrateDeviceBalanceToUser, type UserReferralBalance } from '@/lib/userReferral';

interface ReferralDashboardProps {
  riderId: string;
  referralCode: string | null;
}

export default function ReferralDashboard({ riderId }: ReferralDashboardProps) {
  const [userBal, setUserBal] = useState<UserReferralBalance | null>(null);
  const [businessReferrals, setBusinessReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await migrateDeviceBalanceToUser(user.id).catch(() => {});
        const bal = await getMyUserReferralBalance();
        if (cancelled) return;
        setUserBal(bal);
        const { data: bizRefs } = await (supabase as any).rpc('get_my_business_referrals');
        if (cancelled) return;
        setBusinessReferrals((bizRefs as any[]) || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [riderId]);

  const refresh = async () => {
    const bal = await getMyUserReferralBalance();
    setUserBal(bal);
  };

  const handleTransfer = async () => {
    const amt = Math.floor(Number(transferAmount));
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Enter a valid amount');
    if (amt > (userBal?.balance ?? 0)) return toast.error('Amount exceeds available balance');
    setTransferring(true);
    try {
      const { data, error } = await (supabase as any).rpc('transfer_referral_to_wallet', { _amount: amt });
      if (error) throw error;
      if (!data?.success) {
        const map: Record<string, string> = {
          insufficient_balance: 'Insufficient referral balance',
          business_account_required: 'Only business accounts can transfer to wallet',
          not_authenticated: 'Please sign in again',
          invalid_amount: 'Invalid amount',
        };
        throw new Error(map[data?.error] || 'Transfer failed');
      }
      toast.success(`₦${amt.toLocaleString()} moved to your business wallet`);
      setTransferOpen(false);
      setTransferAmount('');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const code = userBal?.referral_code || '';
  const shareLink = code ? `${window.location.origin}/?ref=${code}` : '';

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success('Referral code copied!');
  };

  const shareCode = () => {
    if (!code) return;
    const message = `Join Loca8tor as a logistics business — I earn ₦2,000 once you subscribe.`;
    if (navigator.share) {
      navigator.share({ title: 'Loca8tor', text: message, url: shareLink }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${message}\n${shareLink}`);
      toast.success('Referral link copied!');
    }
  };

  const credited = businessReferrals.filter(r => r.status === 'credited').length;
  const availableBalance = userBal?.balance ?? 0;

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Referral Program
      </div>

      {/* Referral code card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-primary" />
          <span className="font-heading font-bold text-foreground">Your Referral Code</span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 font-mono text-lg font-bold text-primary text-center tracking-wider">
            {code || '...'}
          </div>
          <button
            onClick={copyCode}
            className="p-2.5 bg-background border border-border rounded-lg hover:border-primary/40 transition-colors"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <button
          onClick={shareCode}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold"
        >
          <Share2 className="w-4 h-4" /> Share Referral Link
        </button>
        <p className="text-[10px] text-muted-foreground text-center mt-2 leading-relaxed">
          Earn <span className="font-bold text-primary">₦2,000</span> per business you refer.
          Credited the moment the referred business finishes the 7-day trial and activates a paid subscription.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-heading font-bold text-foreground">{userBal?.total_referrals ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Total Referrals</p>
        </div>
        <div className="bg-secondary border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-heading font-bold text-primary">{credited}</p>
          <p className="text-[10px] text-muted-foreground">Credited</p>
        </div>
        <div className="bg-secondary border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-heading font-bold text-foreground">₦{userBal?.total_earned ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Earned</p>
        </div>
      </div>

      {/* Transfer to wallet */}
      <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <p className="text-sm font-heading font-bold text-foreground">Use referrals to pay for subscription</p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Available to transfer: <span className="font-bold text-primary">₦{availableBalance.toLocaleString()}</span>.
          Move credited referral earnings into your business wallet and use them towards your next renewal.
        </p>
        {!transferOpen ? (
          <button
            onClick={() => { setTransferOpen(true); setTransferAmount(String(availableBalance || '')); }}
            disabled={availableBalance <= 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4" /> Transfer to business wallet
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground">₦</span>
              <input
                type="number"
                min={1}
                max={availableBalance}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setTransferAmount(String(availableBalance))}
                className="text-[10px] font-bold text-primary px-2 py-1 border border-primary/30 rounded-md"
              >MAX</button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setTransferOpen(false); setTransferAmount(''); }}
                disabled={transferring}
                className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-xs font-bold"
              >Cancel</button>
              <button
                onClick={handleTransfer}
                disabled={transferring}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-60"
              >
                {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Confirm transfer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Business referral progress (mirrors /refer page) */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading referrals...</p>
      ) : businessReferrals.length === 0 ? (
        <div className="bg-secondary border border-border rounded-xl p-6 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No referrals yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Share your code to start earning credits!</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Referral Progress</p>
          {businessReferrals.map((r: any) => {
            const steps = [
              { label: 'Signed up', done: !!r.signup_at },
              { label: 'Trial started', done: !!r.subscribed_at || ['trialing', 'trial', 'active'].includes(r.referred_subscription_status) },
              { label: 'Paid (post-trial)', done: r.status === 'credited' },
            ];
            const done = steps.filter(s => s.done).length;
            const credited = r.status === 'credited';
            const eta = r.expected_credit_at ? new Date(r.expected_credit_at) : null;
            const missing = steps.filter(s => !s.done).map(s => s.label).join(' · ') || 'awaiting credit';
            return (
              <div key={r.id} className="bg-secondary border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {r.referred_business_name || r.referred_email || 'Business referral'}
                    </p>
                    {r.referred_email && r.referred_business_name && (
                      <p className="text-[10px] text-muted-foreground truncate">{r.referred_email}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {credited ? '+₦2,000 credited' : `${done}/${steps.length}`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {steps.map(s => (
                    <div key={s.label} className={`rounded-lg px-2 py-1.5 text-center text-[10px] font-semibold leading-tight ${s.done ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {s.done ? '✓ ' : '○ '}{s.label}
                    </div>
                  ))}
                </div>
                {credited ? (
                  <p className="text-[10px] text-primary font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Credited on {new Date(r.credited_at).toLocaleString()}
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Missing:</span> {missing}
                    </p>
                    {eta && (
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Expected:</span>{' '}
                        {eta.toLocaleDateString()} · {eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link to="/refer" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline">
        Open full Refer & Earn page <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}
