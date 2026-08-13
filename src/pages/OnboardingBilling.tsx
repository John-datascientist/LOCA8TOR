import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, Wallet, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SubscribeModal from '@/components/SubscribeModal';
import SEO from '@/components/SEO';
import { toast } from '@/hooks/use-toast';

type Plan = { code: string; name: string; monthly_price_ngn: number; annual_price_ngn: number };
type PendingTransfer = { id: string; reference_code: string; amount_ngn: number; wallet_credit_ngn: number; created_at: string };

export default function OnboardingBilling() {
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedCode, setSelectedCode] = useState('fleet_standard');
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [show, setShow] = useState(false);
  const [defaults, setDefaults] = useState<{ full_name?: string; email?: string; phone?: string }>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
  const [autoActivating, setAutoActivating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate('/login'); return; }
      setUserId(u.user.id);
      const { data: rider } = await supabase.from('riders')
        .select('account_type, full_name, phone, business_name, business_code')
        .eq('user_id', u.user.id).maybeSingle();
      const at = (rider as any)?.account_type;
      setAccountType(at);
      if (at !== 'business') { navigate('/'); return; }
      // Already paid? bounce them away.
      const { data: effRes } = await (supabase as any).rpc('get_effective_subscription_status', { p_user_id: u.user.id });
      const eff = Array.isArray(effRes) ? effRes[0] : effRes;
      const status = (eff?.effective_status as string) || '';
      if (['active', 'trialing', 'trial'].includes(status)) {
        navigate(at === 'business' ? '/business' : at === 'rider' ? '/rider' : '/');
        return;
      }
      const { data: p } = await supabase.from('subscription_plans')
        .select('code, name, monthly_price_ngn, annual_price_ngn')
        .eq('category', 'fleet')
        .eq('is_active', true)
        .order('sort_order');
      const businessPlans = ((p as any) || []) as Plan[];
      setPlans(businessPlans);
      setSelectedCode(businessPlans[0]?.code || 'fleet_standard');
      setDefaults({
        full_name: (rider as any)?.business_name || (rider as any)?.full_name || '',
        email: u.user.email || '',
        phone: (rider as any)?.phone || '',
      });
      await refreshWalletAndTransfer(u.user.id);
      setLoading(false);
    })();
  }, [navigate]);

  const refreshWalletAndTransfer = async (uid: string) => {
    const [{ data: w }, { data: pt }] = await Promise.all([
      supabase.from('business_wallets').select('balance_ngn').eq('business_user_id', uid).maybeSingle(),
      supabase.from('pending_bank_transfers')
        .select('id, reference_code, amount_ngn, wallet_credit_ngn, created_at')
        .eq('user_id', uid).eq('status', 'pending')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setWalletBalance(Number((w as any)?.balance_ngn ?? 0));
    setPendingTransfer((pt as any) || null);
  };

  // Realtime: react to wallet credits, transfer confirmations, and subscription activation.
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`onboarding-billing-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_wallets', filter: `business_user_id=eq.${userId}` }, () => refreshWalletAndTransfer(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_bank_transfers', filter: `user_id=eq.${userId}` }, () => refreshWalletAndTransfer(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_subscriptions', filter: `business_user_id=eq.${userId}` }, async () => {
        const { data: effRes } = await (supabase as any).rpc('get_effective_subscription_status', { p_user_id: userId });
        const eff = Array.isArray(effRes) ? effRes[0] : effRes;
        if (['active','trialing','trial'].includes(eff?.effective_status)) navigate('/business');
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, navigate]);

  const selectedPlan = plans.find((p) => p.code === selectedCode) || plans[0] || null;
  const amount = selectedPlan ? (cycle === 'annual' ? selectedPlan.annual_price_ngn : selectedPlan.monthly_price_ngn) : 0;
  const canActivateFromWallet = !!selectedPlan && walletBalance >= amount && !pendingTransfer;

  const activateFromWallet = async () => {
    if (!selectedPlan) return;
    setAutoActivating(true);
    const { data, error } = await supabase.functions.invoke('start-trial-from-wallet', {
      body: { plan_code: selectedPlan.code, billing_cycle: cycle },
    });
    setAutoActivating(false);
    const d: any = data;
    if (error || d?.error || d?.insufficient_balance) {
      toast({ title: 'Could not activate plan', description: d?.message || d?.error || error?.message || 'Try again', variant: 'destructive' });
      return;
    }
    toast({ title: '7-day trial started', description: 'Opening your business dashboard…' });
    navigate('/business');
  };

  if (loading || !selectedPlan) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEO title="Activate your plan — Loca8tor" description="Start your 7-day free trial to access your dashboard." path="/onboarding/billing" />
      <div className="min-h-[80vh] flex items-center justify-center px-5 py-10">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-7 space-y-5">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">
              Activate your Business plan
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Set up billing to unlock your business dashboard, fleet, deliveries and customer tracking.
              {' '}You get a <span className="font-bold text-foreground">7-day free trial</span> — your card won't be charged and your wallet won't be debited until the trial ends. Cancel anytime.
            </p>
          </div>

          {pendingTransfer && (
            <div className="rounded-lg ring-1 ring-primary/40 bg-primary/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary text-sm font-heading font-bold">
                <Clock className="w-4 h-4 animate-pulse" /> Awaiting payment confirmation
              </div>
              <p className="text-xs text-foreground/80">
                We received your bank transfer of <span className="font-bold">₦{Number(pendingTransfer.amount_ngn).toLocaleString()}</span>{' '}
                (ref <span className="font-mono font-bold">{pendingTransfer.reference_code}</span>). An admin usually confirms within 1 hour.
                Your plan activates automatically as soon as the funds land in your wallet.
              </p>
              <p className="text-[11px] text-muted-foreground">Wallet balance: ₦{walletBalance.toLocaleString()}</p>
            </div>
          )}

          {!pendingTransfer && walletBalance > 0 && (
            <div className="rounded-lg ring-1 ring-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-foreground">Wallet funded: <span className="font-bold">₦{walletBalance.toLocaleString()}</span></span>
              </div>
              {canActivateFromWallet && (
                <button
                  onClick={activateFromWallet}
                  disabled={autoActivating}
                  className="text-xs font-heading font-bold px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-60"
                >
                  {autoActivating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Activate with wallet'}
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {plans.map((p) => {
              const price = cycle === 'annual' ? p.annual_price_ngn : p.monthly_price_ngn;
              const active = selectedCode === p.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setSelectedCode(p.code)}
                  className={`text-left rounded-lg border p-3 transition-colors ${active ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40 hover:border-primary/40'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-heading font-bold text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.code.includes('premium') ? 'Up to 40 riders + advanced tools' : 'Up to 10 riders'}</p>
                    </div>
                    <p className="font-heading font-black text-primary">₦{price.toLocaleString()}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => setCycle('monthly')} className={`flex-1 py-2 rounded-md ring-1 font-semibold ${cycle==='monthly' ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground'}`}>Monthly</button>
            <button onClick={() => setCycle('annual')} className={`flex-1 py-2 rounded-md ring-1 font-semibold ${cycle==='annual' ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground'}`}>Annual (save 15%)</button>
          </div>

          <div className="rounded-lg bg-secondary/50 border border-border p-4">
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="font-heading font-bold">{selectedPlan.name}</p>
            <p className="text-2xl font-extrabold mt-1">₦{amount.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/{cycle === 'annual' ? 'yr' : 'mo'}</span></p>
          </div>

          <button
            onClick={canActivateFromWallet ? activateFromWallet : () => setShow(true)}
            disabled={autoActivating || !!pendingTransfer}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-heading font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {autoActivating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : pendingTransfer
                ? <><Clock className="w-4 h-4" /> Awaiting payment confirmation</>
                : canActivateFromWallet
                  ? <><Wallet className="w-4 h-4" /> Activate with wallet (₦{walletBalance.toLocaleString()})</>
                  : <><CreditCard className="w-4 h-4" /> Start 7-day free trial</>}
          </button>
          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <Wallet className="w-3 h-3" /> Pay by card, Apple Pay, Google Pay, or wallet
          </p>
        </div>
      </div>
      {show && selectedPlan && (
        <SubscribeModal
          plan={{ code: selectedPlan.code, name: selectedPlan.name, amount, cycle }}
          defaults={defaults}
          onClose={() => { setShow(false); if (userId) refreshWalletAndTransfer(userId); }}
          onSuccess={() => { setShow(false); navigate('/business'); }}
        />
      )}
    </>
  );
}