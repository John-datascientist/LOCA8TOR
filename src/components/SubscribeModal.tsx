import { useEffect, useState } from 'react';
import { Loader2, X, CreditCard, ExternalLink, CheckCircle2, Wallet, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import FundWalletModal from './FundWalletModal';

export type BillingCycle = 'monthly' | 'quarterly' | 'biannual' | 'annual';
type PlanInfo = { code: string; name: string; amount: number; cycle: BillingCycle };

const CYCLE_SHORT: Record<BillingCycle, string> = { monthly: 'mo', quarterly: '3 mo', biannual: '6 mo', annual: 'yr' };
const CYCLE_LONG: Record<BillingCycle, string> = { monthly: 'month', quarterly: '3 months', biannual: '6 months', annual: 'year' };

export default function SubscribeModal({
  plan,
  defaults,
  noTrial = false,
  walletOnly = false,
  onClose,
  onSuccess,
}: {
  plan: PlanInfo;
  defaults?: { full_name?: string; email?: string; phone?: string };
  /** Charge immediately — no 7-day free trial (solo rider / driver plans). */
  noTrial?: boolean;
  /** Hide the card/Stripe option — this plan category is wallet-only for now. */
  walletOnly?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [method, setMethod] = useState<'card' | 'wallet'>(walletOnly ? 'wallet' : 'card');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [showFund, setShowFund] = useState(false);
  const [shortfall, setShortfall] = useState<number | null>(null);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from('riders')
        .select('trial_ends_at').eq('user_id', u.user.id).maybeSingle();
      const end = (data as any)?.trial_ends_at;
      if (!end) return;
      const ms = new Date(end).getTime() - Date.now();
      setRemainingDays(Math.max(0, Math.ceil(ms / 86400000)));
    })();
  }, []);

  const startStripe = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('stripe-create-subscription-checkout', {
      body: { plan_code: plan.code, billing_cycle: plan.cycle },
    });
    setBusy(false);
    if (error || (data as any)?.error || !(data as any)?.url) {
      toast({
        title: 'Could not start card payment',
        description: (data as any)?.error || error?.message || 'Please try again.',
        variant: 'destructive',
      });
      return;
    }
    setSessionId((data as any).session_id);
    // Redirect in the same tab so mobile (and in-app/PWA) browsers don't lose context.
    try {
      sessionStorage.setItem('loca8tor-stripe-session', (data as any).session_id);
    } catch {}
    window.location.assign((data as any).url);
  };

  const startWalletTrial = async () => {
    setBusy(true);
    const fn = noTrial ? 'subscribe-from-wallet' : 'start-trial-from-wallet';
    const { data, error } = await supabase.functions.invoke(fn, {
      body: { plan_code: plan.code, billing_cycle: plan.cycle },
    });
    setBusy(false);
    const d: any = data;
    if (d?.insufficient_balance || d?.error === 'insufficient_funds') {
      const need = d?.shortfall_ngn ?? Math.max(0, Number(d?.required || 0) - Number(d?.balance || 0));
      setShortfall(d.shortfall_ngn ?? null);
      toast({
        title: 'Top up your wallet',
        description: d.message || `You need ₦${Number(need || 0).toLocaleString()} more.`,
      });
      setShowFund(true);
      return;
    }
    if (error || d?.error || d?.ok === false) {
      toast({
        title: noTrial ? 'Payment failed' : 'Could not start trial',
        description: d?.message || d?.error || error?.message || 'Please try again.',
        variant: 'destructive',
      });
      return;
    }
    setTrialEndsAt(d?.trial_ends_at || null);
    setActivated(true);
    try { onSuccess?.(); } catch {}
  };

  // Poll for completion after Stripe checkout opens.
  useEffect(() => {
    if (!sessionId || activated) return;
    const i = window.setInterval(async () => {
      const { data } = await supabase
        .from('subscription_payments')
        .select('status')
        .eq('paga_reference', sessionId)
        .maybeSingle();
      if ((data as any)?.status === 'paid') {
        setActivated(true);
        window.clearInterval(i);
        try { onSuccess?.(); } catch {}
      }
    }, 4000);
    return () => window.clearInterval(i);
  }, [sessionId, activated]);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card ring-1 ring-border rounded-lg w-full max-w-md">
        <header className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-heading font-bold text-foreground text-sm">Subscribe — {plan.name}</p>
            <p className="text-[11px] text-muted-foreground">
              ₦{plan.amount.toLocaleString()}/{CYCLE_SHORT[plan.cycle]}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-4 space-y-3">
          {!activated && !sessionId && !walletOnly && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('card')}
                className={`flex flex-col items-center gap-1 p-3 rounded-md text-xs font-semibold ring-1 transition ${
                  method === 'card' ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Card / Apple Pay / GPay
              </button>
              <button
                onClick={() => setMethod('wallet')}
                className={`flex flex-col items-center gap-1 p-3 rounded-md text-xs font-semibold ring-1 transition ${
                  method === 'wallet' ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Wallet (₦)
              </button>
            </div>
          )}
          {!activated && !sessionId && walletOnly && (
            <div className="flex items-center gap-2 text-[11px] bg-secondary rounded-md p-2.5 text-muted-foreground">
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              API plans are paid from your Loca8tor wallet for now — card payment is coming soon.
            </div>
          )}

          {!activated && !sessionId && (
            <div className="flex items-start gap-2 text-[11px] bg-primary/10 text-primary rounded-md p-2.5">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {noTrial ? (
                <span>
                  This plan has <span className="font-bold">no free trial</span> — ₦{plan.amount.toLocaleString()} is charged now and
                  renews every {CYCLE_LONG[plan.cycle]}. Cancel anytime.
                </span>
              ) : (
              <span>
                {remainingDays === null
                  ? <>You get a <span className="font-bold">7-day free trial</span>.</>
                  : remainingDays > 0
                    ? <>Your existing trial continues — <span className="font-bold">{remainingDays} day{remainingDays === 1 ? '' : 's'} remaining</span>. Switching plans doesn't restart the 7-day trial.</>
                    : <>Your free trial has ended. You'll be billed immediately for the new plan.</>}
                {' '}Your {method === 'card' ? 'card will not be charged' : 'wallet will not be debited'} until the trial ends. Cancel anytime before then and you won't be billed.
              </span>
              )}
            </div>
          )}

          {activated ? (
            <div className="space-y-3 text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
              <p className="font-heading font-bold text-foreground">{noTrial ? 'Subscription active' : '7-day trial started'}</p>
              <p className="text-xs text-muted-foreground">
                {noTrial ? <>Your {plan.name} plan is active. Renews every {CYCLE_LONG[plan.cycle]}.</> : <>
                Your plan is active. {trialEndsAt
                  ? <>First {method === 'card' ? 'charge' : 'wallet debit'} on <span className="font-semibold text-foreground">{new Date(trialEndsAt).toLocaleDateString()}</span>.</>
                  : <>You won't be billed until the 7-day trial ends.</>}
                </>}
              </p>
              <button onClick={onClose} className="w-full bg-primary text-primary-foreground font-heading font-bold py-2.5 rounded-md text-sm">Done</button>
            </div>
          ) : sessionId ? (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                {noTrial
                  ? 'Stripe Checkout opened. Complete the payment to activate your subscription.'
                  : "Stripe Checkout opened in a new tab. Add your card to start the 7-day free trial — your card won't be charged until the trial ends."}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground justify-center py-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for Stripe to confirm…
              </div>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground">
                {noTrial
                  ? method === 'card'
                    ? <>Pay with Stripe — you'll be charged the USD equivalent of ₦{plan.amount.toLocaleString()} now, and the subscription renews automatically each {CYCLE_LONG[plan.cycle]}. Cancel anytime.</>
                    : <>₦{plan.amount.toLocaleString()} is debited from your wallet now and the subscription renews each {CYCLE_LONG[plan.cycle]}. Cancel anytime.</>
                  : method === 'card'
                  ? <>Add your card via Stripe to start a 7-day free trial. After the trial, you'll be charged the USD equivalent of ₦{plan.amount.toLocaleString()} and the subscription renews automatically each {CYCLE_LONG[plan.cycle]}. Cancel anytime.</>
                  : <>Your wallet must hold at least ₦{plan.amount.toLocaleString()} to start the trial. Nothing is deducted now — after 7 days, ₦{plan.amount.toLocaleString()} is debited and the subscription renews each {CYCLE_LONG[plan.cycle]}. Cancel anytime.</>}
              </p>
              <button
                onClick={method === 'card' ? startStripe : startWalletTrial}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-heading font-bold py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {busy
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : method === 'card' ? <ExternalLink className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                {noTrial
                  ? method === 'card' ? `Pay ₦${plan.amount.toLocaleString()} with Stripe` : `Pay ₦${plan.amount.toLocaleString()} from Wallet`
                  : method === 'card' ? 'Start 7-day trial with Stripe' : 'Start 7-day trial with Wallet'}
              </button>
            </>
          )}
        </div>
      </div>
      {showFund && (
        <FundWalletModal onClose={() => setShowFund(false)} />
      )}
    </div>
  );
}