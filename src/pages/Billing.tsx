import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Wallet as WalletIcon, Calendar, AlertCircle, Plus, XCircle, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import FundWalletModal from '@/components/FundWalletModal';
import SubscribeModal from '@/components/SubscribeModal';
import DeleteAccountSection from '@/components/DeleteAccountSection';

type Plan = {
  id: string; code: string; name: string; category: 'fleet' | 'api' | 'rider';
  monthly_price_ngn: number; annual_price_ngn: number; description: string | null;
  sort_order: number;
};
type BSub = {
  id: string; plan_code: string; billing_cycle: 'monthly' | 'annual';
  status: string; current_period_end: string | null; next_renewal_at: string | null;
};

export default function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<BSub | null>(null);
  const [apiSub, setApiSub] = useState<BSub | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [fund, setFund] = useState(false);
  const [checkout, setCheckout] = useState<{ code: string; name: string; amount: number; category: string } | null>(null);
  const [defaults, setDefaults] = useState<{ full_name?: string; email?: string; phone?: string }>({});
  const [cancelling, setCancelling] = useState<'fleet' | 'api' | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const [{ data: p }, { data: s }, { data: as }, { data: rider }, { data: wallet }] = await Promise.all([
      supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order'),
      u.user
        ? supabase.from('business_subscriptions').select('*').eq('business_user_id', u.user.id).in('status', ['active','past_due']).maybeSingle()
        : Promise.resolve({ data: null }) as any,
      u.user
        ? supabase.from('api_subscriptions').select('*').eq('business_user_id', u.user.id).in('status', ['active','past_due']).maybeSingle()
        : Promise.resolve({ data: null }) as any,
      u.user ? supabase.from('riders').select('account_type, full_name, phone, business_name').eq('user_id', u.user.id).maybeSingle() : Promise.resolve({ data: null }) as any,
      u.user ? supabase.from('business_wallets').select('balance_ngn').eq('business_user_id', u.user.id).maybeSingle() : Promise.resolve({ data: null }) as any,
    ]);
    setPlans((p as any) || []);
    setSub((s as any) || null);
    setApiSub((as as any) || null);
    setAccountType((rider as any)?.account_type || null);
    setBalance(Number((wallet as any)?.balance_ngn ?? 0));
    setDefaults({
      full_name: (rider as any)?.business_name || (rider as any)?.full_name || '',
      email: u.user?.email || '',
      phone: (rider as any)?.phone || '',
    });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const subscribe = async (plan_code: string) => {
    const p = plans.find((x) => x.code === plan_code);
    if (!p) return;
    const amount = cycle === 'annual' ? p.annual_price_ngn : p.monthly_price_ngn;
    setCheckout({ code: p.code, name: p.name, amount, category: p.category });
  };

  const cancelFleetSub = async () => {
    if (!sub) return;
    if (!confirm('Cancel your fleet subscription? You will lose access at the end of the current period.')) return;
    setCancelling('fleet');
    const { data, error } = await supabase.functions.invoke('cancel-subscription', {});
    setCancelling(null);
    if (error || (data as any)?.error) {
      toast({ title: 'Cancel failed', description: (data as any)?.error || error?.message || 'Try again', variant: 'destructive' });
      return;
    }
    toast({ title: 'Fleet subscription cancelled' });
    load();
  };

  const cancelApiSub = async () => {
    if (!apiSub) return;
    if (!confirm('Cancel your API subscription? Your API keys will stop working once the current period ends.')) return;
    setCancelling('api');
    const { error } = await supabase.from('api_subscriptions')
      .update({ status: 'cancelled', auto_renew: false, cancelled_at: new Date().toISOString() })
      .eq('id', apiSub.id);
    setCancelling(null);
    if (error) {
      toast({ title: 'Cancel failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'API subscription cancelled' });
    load();
  };

  const subFor = (code: string, category: string) =>
    category === 'api' ? (apiSub?.plan_code === code ? apiSub : undefined) : (sub?.plan_code === code ? sub : undefined);
  const fleet = plans.filter(p => p.category === 'fleet');
  const api = plans.filter(p => p.category === 'api');

  const isBusiness = accountType === 'business';

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Link to="/" className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="font-heading font-bold text-foreground">Billing & Subscriptions</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {!loading && !isBusiness && (
          <div className="bg-card ring-1 ring-border rounded-lg p-6 text-center space-y-2">
            <WalletIcon className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="font-heading font-bold text-foreground">Business accounts only</p>
            <p className="text-xs text-muted-foreground">Subscription plans and the wallet are available for business accounts. Personal accounts use Loca8tor free tools.</p>
          </div>
        )}

        {isBusiness && (
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/30 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <WalletIcon className="w-3 h-3" /> Wallet balance
              </p>
              <p className="font-heading text-2xl font-bold text-foreground">₦{balance.toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFund(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-md">
                <Plus className="w-3.5 h-3.5" /> Fund
              </button>
              <Link to="/wallet" className="text-xs font-semibold px-3 py-2 rounded-md bg-secondary">Wallet</Link>
            </div>
          </div>
        )}

        {isBusiness && (
        <div className="flex items-center justify-between bg-card ring-1 ring-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Billing cycle</p>
          <div className="flex gap-1 bg-secondary rounded-md p-1">
            {(['monthly','annual'] as const).map(c => (
              <button key={c} onClick={() => setCycle(c)}
                className={`px-3 py-1.5 text-xs font-semibold rounded capitalize ${cycle === c ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                {c} {c === 'annual' && <span className="text-primary">−15%</span>}
              </button>
            ))}
          </div>
        </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : isBusiness ? (
          <>
            <Section title="Fleet plans" plans={fleet} cycle={cycle} subFor={subFor} onSubscribe={subscribe} busy={busy} />
            <Section title="API plans" plans={api} cycle={cycle} subFor={subFor} onSubscribe={subscribe} busy={busy} />

            {apiSub && apiSub.status !== 'cancelled' && (
              <div className="flex items-center justify-between gap-2 bg-card ring-1 ring-border rounded-lg p-3">
                <Link to="/api-keys" className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <KeyRound className="w-3.5 h-3.5" /> Manage API keys
                </Link>
              </div>
            )}

            {sub && sub.status !== 'cancelled' && (
              <div className="bg-card ring-1 ring-border rounded-lg p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Active fleet subscription: {sub.plan_code}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {sub.next_renewal_at
                      ? <>Next billing: {new Date(sub.next_renewal_at).toLocaleDateString()}</>
                      : 'Auto-renews each cycle.'}
                  </p>
                </div>
                <button
                  onClick={cancelFleetSub}
                  disabled={cancelling === 'fleet'}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  {cancelling === 'fleet' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Cancel
                </button>
              </div>
            )}

            {apiSub && apiSub.status !== 'cancelled' && (
              <div className="bg-card ring-1 ring-border rounded-lg p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Active API subscription: {apiSub.plan_code}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {apiSub.next_renewal_at
                      ? <>Next billing: {new Date(apiSub.next_renewal_at).toLocaleDateString()}</>
                      : 'Auto-renews each cycle.'}
                  </p>
                </div>
                <button
                  onClick={cancelApiSub}
                  disabled={cancelling === 'api'}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  {cancelling === 'api' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-accent/10 rounded-md p-3">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Every new plan starts with a <span className="font-semibold text-foreground">7-day free trial</span>. Your card or wallet is only debited after the trial ends — cancel anytime before then and you won't be charged.</span>
            </div>
          </>
        ) : null}

        <DeleteAccountSection />
      </main>

      {fund && <FundWalletModal onClose={() => { setFund(false); load(); }} />}
      {checkout && (
        <SubscribeModal
          plan={{ code: checkout.code, name: checkout.name, amount: checkout.amount, cycle }}
          defaults={defaults}
          walletOnly={checkout.category === 'api'}
          onClose={() => { setCheckout(null); load(); }}
        />
      )}
    </div>
  );
}

function Section({ title, plans, cycle, subFor, onSubscribe, busy }: {
  title: string; plans: Plan[]; cycle: 'monthly' | 'annual';
  subFor: (c: string, category: string) => BSub | undefined;
  onSubscribe: (c: string) => void;
  busy: string | null;
}) {
  if (!plans.length) return null;
  return (
    <section className="space-y-3">
      <p className="font-heading font-bold text-foreground">{title}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {plans.map(p => {
          const sub = subFor(p.code, p.category);
          const price = cycle === 'annual' ? p.annual_price_ngn : p.monthly_price_ngn;
          const active = sub?.status === 'active';
          return (
            <div key={p.id} className="bg-card ring-1 ring-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading font-bold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.description}</p>
                </div>
                {active && <span className="text-[10px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded">ACTIVE</span>}
                {sub?.status === 'past_due' && <span className="text-[10px] bg-destructive/15 text-destructive font-bold px-2 py-0.5 rounded">PAST DUE</span>}
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">
                ₦{price.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/{cycle === 'annual' ? 'yr' : 'mo'}</span>
              </p>
              {sub?.next_renewal_at && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Renews {new Date(sub.next_renewal_at).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onSubscribe(p.code)}
                  disabled={busy === p.code}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy === p.code ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {active ? 'Renew' : sub?.status === 'past_due' ? 'Reactivate' : 'Subscribe'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}