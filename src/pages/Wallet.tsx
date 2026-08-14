import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Wallet as WalletIcon, Plus, Loader2, ArrowDownCircle, ArrowUpCircle, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import FundWalletModal from '@/components/FundWalletModal';

type Tx = {
  id: string; amount: number; type: 'credit'|'debit'; status: string;
  payment_method: string; description: string | null; created_at: string;
};
type Sub = {
  id: string; plan_code: string; billing_cycle: string; status: string;
  current_period_end: string | null; next_renewal_at: string | null;
};

export default function Wallet() {
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [sub, setSub] = useState<Sub | null>(null);
  const [fund, setFund] = useState(false);
  // Solo riders/drivers pay for their own plan via /rider's SubscribeModal,
  // not the business-only /billing page (which doesn't even list rider-
  // category plans) — track this so the "manage subscription" links below
  // send them to the right place instead of a dead end.
  const [isSoloRider, setIsSoloRider] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const [{ data: rider }, { data: wallet }, { data: txList }, { data: subRow }] = await Promise.all([
      supabase.from('riders').select('account_type, rider_mode').eq('user_id', u.user.id).maybeSingle(),
      supabase.from('business_wallets').select('balance_ngn').eq('business_user_id', u.user.id).maybeSingle(),
      supabase.from('wallet_transactions').select('*').eq('business_user_id', u.user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('business_subscriptions').select('*').eq('business_user_id', u.user.id).in('status', ['active','past_due']).maybeSingle(),
    ]);
    // Solo riders/drivers pay for their own plan, so they get wallet access too.
    const isSolo = (rider as any)?.rider_mode === 'individual';
    setIsSoloRider(isSolo);
    setAccountType(isSolo ? 'business' : ((rider as any)?.account_type || null));
    setBalance(Number((wallet as any)?.balance_ngn ?? 0));
    setTxs((txList as any) || []);
    setSub((subRow as any) || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime: refresh on wallet/transaction changes
  useEffect(() => {
    const ch = supabase.channel('wallet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_wallets' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }
  if (accountType && accountType !== 'business') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Link to="/" className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="font-heading font-bold text-foreground">Business Wallet</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <WalletIcon className="w-3.5 h-3.5" /> Wallet balance
            </p>
          </div>
          <p className="font-heading text-4xl font-bold text-foreground">₦{balance.toLocaleString()}</p>
          {(() => {
            const pending = txs.filter(t => t.type === 'credit' && t.status === 'pending' && t.payment_method === 'bank_transfer');
            if (pending.length === 0) return null;
            const total = pending.reduce((a, t) => a + Number(t.amount || 0), 0);
            const latest = pending[0];
            return (
              <div className="rounded-lg bg-secondary/60 ring-1 ring-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-foreground font-bold">Transfer awaiting verification</p>
                    <p className="text-[11px] text-muted-foreground">Confirmation pending admin review</p>
                  </div>
                </div>
                <div className="rounded-md bg-background/60 ring-1 ring-border divide-y divide-border text-xs">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Pending transfers</span>
                    <span className="font-bold text-foreground">{pending.length}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Total amount</span>
                    <span className="font-heading font-bold text-foreground">₦{total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-semibold text-foreground">{new Date(latest.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Status</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Awaiting verification
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your wallet will be credited once admin verifies the transfer (usually within 1 hour).
                </p>
              </div>
            );
          })()}
          <div className="flex gap-2">
            <button onClick={() => setFund(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Fund Wallet
            </button>
            <Link to={isSoloRider ? '/rider' : '/billing'} className="text-sm font-semibold px-4 py-2 rounded-md bg-secondary hover:bg-secondary/70">
              Manage subscription
            </Link>
          </div>
        </div>

        {/* Subscription card */}
        <section className="bg-card ring-1 ring-border rounded-lg p-4 space-y-2">
          <p className="font-heading font-bold text-foreground">Active subscription</p>
          {sub ? (
            <div className="text-sm space-y-1">
              <p className="text-foreground capitalize">{sub.plan_code.replace('_',' ')} · <span className="text-muted-foreground">{sub.billing_cycle}</span></p>
              <p className={`text-xs font-semibold ${sub.status === 'active' ? 'text-primary' : 'text-destructive'} capitalize`}>{sub.status.replace('_',' ')}</p>
              {sub.next_renewal_at && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Next renewal {new Date(sub.next_renewal_at).toLocaleDateString()}
                </p>
              )}
              {sub.status === 'past_due' && (
                <p className="text-[11px] bg-destructive/10 text-destructive p-2 rounded mt-2">
                  Your wallet was insufficient at renewal. Top up to reactivate.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No active subscription. Visit <Link to={isSoloRider ? '/rider' : '/billing'} className="text-primary underline">{isSoloRider ? 'your rider dashboard' : 'Billing'}</Link> to pick a plan.
            </p>
          )}
        </section>

        {/* Transactions */}
        <section className="bg-card ring-1 ring-border rounded-lg p-4 space-y-3">
          <p className="font-heading font-bold text-foreground">Transaction history</p>
          {txs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {txs.map(t => (
                <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.type === 'credit'
                      ? <ArrowDownCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      : <ArrowUpCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{t.description || (t.type === 'credit' ? 'Wallet credit' : 'Wallet debit')}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {t.payment_method.replace('_',' ')}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-heading text-sm font-bold ${t.type === 'credit' ? 'text-primary' : 'text-foreground'}`}>
                      {t.type === 'credit' ? '+' : '−'}₦{Number(t.amount).toLocaleString()}
                    </p>
                    <p className={`text-[10px] capitalize ${t.status === 'successful' ? 'text-primary' : t.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>{t.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {fund && <FundWalletModal onClose={() => { setFund(false); load(); }} />}
    </div>
  );
}