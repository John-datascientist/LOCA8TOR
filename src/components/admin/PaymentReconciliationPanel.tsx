import { useEffect, useMemo, useState } from 'react';
import { X, RefreshCw, Download, AlertTriangle, CheckCircle2, Wallet, ChevronRight, Play, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Props = { onClose: () => void };

type Debit = {
  id: string;
  business_user_id: string;
  amount: number;
  description: string | null;
  subscription_id: string | null;
  created_at: string;
};

type Renewal = {
  id: string;
  business_user_id: string;
  plan_code: string | null;
  billing_cycle: string | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_renewal_at: string | null;
  created_at: string;
};

type Plan = { code: string; monthly_price_ngn: number; annual_price_ngn: number };

type Row = {
  key: string;
  business_user_id: string;
  business_name: string;
  email: string;
  period_start: string | null;
  period_end: string | null;
  plan_code: string | null;
  cycle: string | null;
  expected_ngn: number | null;
  debit_ngn: number | null;
  debit_at: string | null;
  status: 'matched' | 'amount_mismatch' | 'debit_only' | 'renewal_missing_debit';
  note: string;
  debit?: Debit | null;
  renewal?: Renewal | null;
  plan?: Plan | null;
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

function csvCell(v: any) {
  if (v === null || v === undefined) return '';
  return `"${String(v).replace(/"/g, '""')}"`;
}

export default function PaymentReconciliationPanel({ onClose }: Props) {
  const today = new Date();
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);

  const [from, setFrom] = useState(toISODate(monthAgo));
  const [to, setTo] = useState(toISODate(today));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<'all' | 'mismatch'>('mismatch');
  const [businessFilter, setBusinessFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [drill, setDrill] = useState<Row | null>(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ processed: number; results: any[] } | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [subs, setSubs] = useState<Renewal[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  const runRenewals = async () => {
    if (!confirm(`Force process-subscription-renewals now for renewals due ${from} → ${to}${businessFilter !== 'all' ? ' (filtered business)' : ''}?`)) return;
    setRunning(true); setRunResult(null); setError(null);
    try {
      const fromISO = new Date(`${from}T00:00:00Z`).toISOString();
      const toISO = new Date(`${to}T23:59:59Z`).toISOString();
      const { data, error } = await supabase.functions.invoke('admin-run-subscription-renewals', {
        body: {
          from: fromISO,
          to: toISO,
          business_user_id: businessFilter !== 'all' ? businessFilter : null,
        },
      });
      if (error) throw error;
      setRunResult(data as any);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to run renewals');
    } finally {
      setRunning(false);
    }
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const fromISO = new Date(`${from}T00:00:00Z`).toISOString();
      const toISO = new Date(`${to}T23:59:59Z`).toISOString();

      const [debitsRes, subsRes, plansRes, ridersRes] = await Promise.all([
        supabase.from('wallet_transactions')
          .select('id, business_user_id, amount, description, subscription_id, created_at')
          .eq('type', 'debit').eq('status', 'successful')
          .gte('created_at', fromISO).lte('created_at', toISO),
        supabase.from('business_subscriptions')
          .select('id, business_user_id, plan_code, billing_cycle, status, current_period_start, current_period_end, next_renewal_at, created_at'),
        supabase.from('subscription_plans')
          .select('code, monthly_price_ngn, annual_price_ngn'),
        supabase.from('riders').select('user_id, business_name, full_name'),
      ]);

      if (debitsRes.error) throw debitsRes.error;
      if (subsRes.error) throw subsRes.error;

      const debits = (debitsRes.data as Debit[] || []).filter(d =>
        !!d.subscription_id || (typeof d.description === 'string' && d.description.toLowerCase().startsWith('subscription')));
      const subs = (subsRes.data as Renewal[] || []);
      setSubs(subs);
      const plans: Record<string, Plan> = {};
      ((plansRes.data as Plan[]) || []).forEach(p => { plans[p.code] = p; });
      const nameMap: Record<string, string> = {};
      ((ridersRes.data as any[]) || []).forEach(r => {
        if (r.user_id) nameMap[r.user_id] = r.business_name || r.full_name || '—';
      });
      setNameMap(nameMap);

      // Email enrichment (best-effort via admin RPC).
      const emailMap: Record<string, string> = {};
      try {
        const { data: authList } = await (supabase as any).rpc('admin_list_registered_users');
        ((authList as any[]) || []).forEach((u: any) => {
          if (u?.user_id && u?.email) emailMap[u.user_id] = u.email;
        });
      } catch {}

      // Renewals in range = periods whose current_period_start falls inside [from, to] AND aren't the initial trial period.
      const renewals = subs.filter(s => {
        if (!s.current_period_start) return false;
        const t = new Date(s.current_period_start).getTime();
        return t >= new Date(fromISO).getTime() && t <= new Date(toISO).getTime();
      });

      const usedDebitIds = new Set<string>();
      const out: Row[] = [];

      for (const r of renewals) {
        const plan = r.plan_code ? plans[r.plan_code] : undefined;
        const expected = plan ? (r.billing_cycle === 'annual' ? plan.annual_price_ngn : plan.monthly_price_ngn) : null;
        // Try to match a debit for this subscription id, else nearest debit for this user around period_start (±48h).
        const periodStart = new Date(r.current_period_start!).getTime();
        let match: Debit | undefined = debits.find(d => !usedDebitIds.has(d.id) && d.subscription_id === r.id);
        if (!match) {
          match = debits
            .filter(d => !usedDebitIds.has(d.id) && d.business_user_id === r.business_user_id)
            .map(d => ({ d, delta: Math.abs(new Date(d.created_at).getTime() - periodStart) }))
            .filter(x => x.delta <= 48 * 3600 * 1000)
            .sort((a, b) => a.delta - b.delta)[0]?.d;
        }
        if (match) usedDebitIds.add(match.id);

        let status: Row['status'] = 'matched';
        let note = 'Debit matches renewal';
        if (!match) { status = 'renewal_missing_debit'; note = 'Renewal recorded but no wallet debit found'; }
        else if (expected != null && Number(match.amount) !== Number(expected)) {
          status = 'amount_mismatch'; note = `Debit ₦${Number(match.amount).toLocaleString()} ≠ expected ₦${expected.toLocaleString()}`;
        }

        out.push({
          key: `r-${r.id}`,
          business_user_id: r.business_user_id,
          business_name: nameMap[r.business_user_id] || '—',
          email: emailMap[r.business_user_id] || '—',
          period_start: r.current_period_start,
          period_end: r.current_period_end,
          plan_code: r.plan_code,
          cycle: r.billing_cycle,
          expected_ngn: expected,
          debit_ngn: match ? Number(match.amount) : null,
          debit_at: match ? match.created_at : null,
          status,
          note,
          debit: match || null,
          renewal: r,
          plan: plan || null,
        });
      }

      // Debits with no matching renewal in the range.
      for (const d of debits) {
        if (usedDebitIds.has(d.id)) continue;
        out.push({
          key: `d-${d.id}`,
          business_user_id: d.business_user_id,
          business_name: nameMap[d.business_user_id] || '—',
          email: emailMap[d.business_user_id] || '—',
          period_start: null,
          period_end: null,
          plan_code: null,
          cycle: null,
          expected_ngn: null,
          debit_ngn: Number(d.amount),
          debit_at: d.created_at,
          status: 'debit_only',
          note: d.subscription_id
            ? 'Wallet debit references a subscription id but no renewal falls inside this range'
            : 'Wallet debit tagged as subscription but no renewal falls inside this range',
          debit: d,
          renewal: null,
          plan: null,
        });
      }

      out.sort((a, b) => (b.period_start || b.debit_at || '').localeCompare(a.period_start || a.debit_at || ''));
      setRows(out);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const counts = useMemo(() => ({
    total: rows.length,
    matched: rows.filter(r => r.status === 'matched').length,
    amount_mismatch: rows.filter(r => r.status === 'amount_mismatch').length,
    debit_only: rows.filter(r => r.status === 'debit_only').length,
    renewal_missing_debit: rows.filter(r => r.status === 'renewal_missing_debit').length,
  }), [rows]);

  const businessOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach(r => { if (!map.has(r.business_user_id)) map.set(r.business_user_id, r.business_name); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const planOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if (r.plan_code) s.add(r.plan_code); });
    return Array.from(s).sort();
  }, [rows]);

  const visible = rows.filter(r => {
    if (filter !== 'all' && r.status === 'matched') return false;
    if (businessFilter !== 'all' && r.business_user_id !== businessFilter) return false;
    if (planFilter !== 'all' && r.plan_code !== planFilter) return false;
    return true;
  });

  const downloadCsv = () => {
    const headers = ['Business','Email','Plan','Cycle','Period Start','Period End','Expected NGN','Debit NGN','Debit At','Status','Note'];
    const lines = [headers.map(csvCell).join(',')];
    visible.forEach(r => {
      lines.push([r.business_name, r.email, r.plan_code, r.cycle,
        r.period_start, r.period_end, r.expected_ngn, r.debit_ngn, r.debit_at, r.status, r.note].map(csvCell).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payment-reconciliation-${from}_to_${to}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusColor = (s: Row['status']) =>
    s === 'matched' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' :
    s === 'amount_mismatch' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' :
    s === 'debit_only' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/30' :
    'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full overflow-y-auto">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <div className="bg-card rounded-2xl ring-1 ring-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-heading font-bold text-foreground text-sm">Payment Reconciliation</p>
                  <p className="text-[11px] text-muted-foreground">Compare wallet debits against subscription renewals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={downloadCsv} disabled={visible.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-border flex flex-wrap items-end gap-3">
              <div>
                <label className="text-[10px] uppercase font-semibold text-muted-foreground">From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="block bg-secondary/50 rounded-md text-sm ring-1 ring-border px-2 py-1 focus:outline-none focus:ring-primary" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-muted-foreground">To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="block bg-secondary/50 rounded-md text-sm ring-1 ring-border px-2 py-1 focus:outline-none focus:ring-primary" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-muted-foreground">Business</label>
                <select value={businessFilter} onChange={(e) => setBusinessFilter(e.target.value)}
                  className="block bg-secondary/50 rounded-md text-sm ring-1 ring-border px-2 py-1 focus:outline-none focus:ring-primary max-w-[200px]">
                  <option value="all">All businesses</option>
                  {businessOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-muted-foreground">Plan</label>
                <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
                  className="block bg-secondary/50 rounded-md text-sm ring-1 ring-border px-2 py-1 focus:outline-none focus:ring-primary">
                  <option value="all">All plans</option>
                  {planOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button onClick={load} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg text-xs font-semibold ring-1 ring-border disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Loading' : 'Run report'}
              </button>
              <button onClick={runRenewals} disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/90 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                <Play className={`w-3.5 h-3.5 ${running ? 'animate-pulse' : ''}`} /> {running ? 'Running…' : 'Force renewals'}
              </button>
              <button onClick={() => setShowTimeline(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 ${showTimeline ? 'ring-primary bg-primary/10 text-primary' : 'ring-border text-muted-foreground'}`}>
                <Clock className="w-3.5 h-3.5" /> Timeline
              </button>
              <div className="ml-auto flex items-center gap-1 text-[11px]">
                <button onClick={() => setFilter('mismatch')}
                  className={`px-2.5 py-1 rounded-md ring-1 ${filter === 'mismatch' ? 'ring-primary bg-primary/10 text-primary font-semibold' : 'ring-border text-muted-foreground'}`}>
                  Discrepancies
                </button>
                <button onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 rounded-md ring-1 ${filter === 'all' ? 'ring-primary bg-primary/10 text-primary font-semibold' : 'ring-border text-muted-foreground'}`}>
                  All rows
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-border grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <Stat label="Total" value={counts.total} />
              <Stat label="Matched" value={counts.matched} color="text-emerald-600" />
              <Stat label="Amount mismatch" value={counts.amount_mismatch} color="text-amber-600" />
              <Stat label="Missing debit" value={counts.renewal_missing_debit} color="text-red-600" />
              <Stat label="Debit only" value={counts.debit_only} color="text-sky-600" />
            </div>

            {error && (
              <div className="mx-5 my-3 p-3 rounded-lg bg-red-500/10 ring-1 ring-red-500/30 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}

            {runResult && (
              <div className="mx-5 my-3 p-3 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200">
                <p className="font-semibold mb-1">Manual run complete — processed {runResult.processed} subscription(s).</p>
                {runResult.results.slice(0, 8).map((r, i) => (
                  <p key={i} className="font-mono text-[11px] truncate">
                    {r.plan_code || '—'} · {String(r.subscription_id).slice(0, 8)} → {r.error ? `❌ ${r.error}` : '✅ ok'}
                  </p>
                ))}
                {runResult.results.length > 8 && <p className="italic mt-1">…and {runResult.results.length - 8} more.</p>}
              </div>
            )}

            {showTimeline && !loading && (
              <TimelineSection
                subs={subs}
                nameMap={nameMap}
                rows={rows}
                businessFilter={businessFilter}
                planFilter={planFilter}
              />
            )}

            <div className="max-h-[65vh] overflow-y-auto divide-y divide-border">
              {loading && <p className="p-6 text-sm text-muted-foreground text-center">Reconciling…</p>}
              {!loading && visible.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No {filter === 'mismatch' ? 'discrepancies' : 'rows'} in this range.
                </p>
              )}
              {visible.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setDrill(r)}
                  className="w-full text-left px-5 py-3 hover:bg-secondary/40 block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-sm text-foreground truncate">{r.business_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.email} {r.plan_code ? `· ${r.plan_code} (${r.cycle})` : ''}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {r.period_start && <>Period: {new Date(r.period_start).toLocaleDateString()} → {r.period_end ? new Date(r.period_end).toLocaleDateString() : '—'} · </>}
                        Expected: {r.expected_ngn != null ? `₦${r.expected_ngn.toLocaleString()}` : '—'} ·{' '}
                        Debit: {r.debit_ngn != null ? `₦${r.debit_ngn.toLocaleString()}` : '—'}
                        {r.debit_at && ` on ${new Date(r.debit_at).toLocaleString()}`}
                      </p>
                      <p className="text-[11px] mt-1 text-foreground/80">{r.note}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${statusColor(r.status)}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {drill && <DrilldownDrawer row={drill} onClose={() => setDrill(null)} />}
    </div>
  );
}

function Stat({ label, value, color = 'text-foreground' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg ring-1 ring-border p-2">
      <p className={`text-lg font-heading font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function TimelineSection({
  subs, nameMap, rows, businessFilter, planFilter,
}: {
  subs: Renewal[];
  nameMap: Record<string, string>;
  rows: Row[];
  businessFilter: string;
  planFilter: string;
}) {
  // Map subscription_id -> matched debit (from computed rows).
  const debitBySubId = new Map<string, { amount: number; at: string }>();
  rows.forEach(r => {
    if (r.renewal?.id && r.debit) debitBySubId.set(r.renewal.id, { amount: Number(r.debit.amount), at: r.debit.created_at });
  });

  const filtered = subs.filter(s => {
    if (businessFilter !== 'all' && s.business_user_id !== businessFilter) return false;
    if (planFilter !== 'all' && s.plan_code !== planFilter) return false;
    return s.status === 'active' || s.status === 'past_due';
  });

  const nextCronTick = (from: Date) => {
    const d = new Date(from);
    d.setUTCMinutes(7, 0, 0);
    if (d <= from) d.setUTCHours(d.getUTCHours() + 1);
    return d;
  };

  const fmt = (v?: string | null) => v ? new Date(v).toLocaleString() : '—';
  const now = new Date();

  if (filtered.length === 0) {
    return <p className="mx-5 my-3 text-xs text-muted-foreground italic">No active subscriptions match the current filters.</p>;
  }

  return (
    <div className="mx-5 my-3 rounded-xl ring-1 ring-border overflow-hidden">
      <div className="px-3 py-2 bg-secondary/40 border-b border-border">
        <p className="text-[10px] uppercase font-bold text-muted-foreground">Renewal timeline · cron runs at :07 UTC hourly</p>
      </div>
      <div className="divide-y divide-border max-h-[40vh] overflow-y-auto">
        {filtered.map(s => {
          const trialEnd = s.current_period_start ? new Date(new Date(s.current_period_start).getTime() + 7 * 24 * 3600 * 1000) : null;
          const nextRenewal = s.next_renewal_at ? new Date(s.next_renewal_at) : null;
          const cronTick = nextRenewal ? nextCronTick(nextRenewal) : null;
          const debit = debitBySubId.get(s.id);
          const overdue = nextRenewal && nextRenewal < now && !debit;
          return (
            <div key={s.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-heading font-semibold text-foreground truncate">
                  {nameMap[s.business_user_id] || '—'} <span className="text-muted-foreground font-normal text-xs">· {s.plan_code} ({s.billing_cycle})</span>
                </p>
                {debit ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30">
                    debited ₦{debit.amount.toLocaleString()}
                  </span>
                ) : overdue ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 ring-1 ring-red-500/30">
                    overdue — no debit
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30">
                    upcoming
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <TimelineCell label="Trial ends" value={fmt(trialEnd?.toISOString())} />
                <TimelineCell label="Next renewal" value={fmt(s.next_renewal_at)} />
                <TimelineCell label="Next cron tick" value={fmt(cronTick?.toISOString())} />
                <TimelineCell label="Debit created" value={debit ? fmt(debit.at) : '—'} highlight={!debit && !!overdue ? 'red' : debit ? 'green' : undefined} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineCell({ label, value, highlight }: { label: string; value: string; highlight?: 'red' | 'green' }) {
  const color = highlight === 'red' ? 'text-red-600 dark:text-red-400' : highlight === 'green' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground';
  return (
    <div className="rounded-lg ring-1 ring-border bg-secondary/30 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-mono text-[11px] ${color}`}>{value}</p>
    </div>
  );
}

function DrilldownDrawer({ row, onClose }: { row: Row; onClose: () => void }) {
  const fmt = (v: any) => {
    if (v === null || v === undefined || v === '') return <span className="text-muted-foreground italic">—</span>;
    if (typeof v === 'number') return v.toLocaleString();
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString();
    return String(v);
  };
  const debitFields: [string, any][] = row.debit ? [
    ['id', row.debit.id],
    ['business_user_id', row.debit.business_user_id],
    ['amount (₦)', row.debit.amount],
    ['description', row.debit.description],
    ['subscription_id', row.debit.subscription_id],
    ['created_at', row.debit.created_at],
  ] : [];
  const renewalFields: [string, any][] = row.renewal ? [
    ['id', row.renewal.id],
    ['business_user_id', row.renewal.business_user_id],
    ['plan_code', row.renewal.plan_code],
    ['billing_cycle', row.renewal.billing_cycle],
    ['status', row.renewal.status],
    ['current_period_start', row.renewal.current_period_start],
    ['current_period_end', row.renewal.current_period_end],
    ['next_renewal_at', row.renewal.next_renewal_at],
    ['created_at', row.renewal.created_at],
  ] : [];
  const expected = row.plan ? (row.renewal?.billing_cycle === 'annual' ? row.plan.annual_price_ngn : row.plan.monthly_price_ngn) : null;
  const diff = row.debit && expected != null ? Number(row.debit.amount) - Number(expected) : null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-card ring-1 ring-border shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm text-foreground truncate">{row.business_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{row.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl ring-1 ring-border p-3 bg-secondary/30">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Comparison</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">Expected</p>
                <p className="font-heading font-bold text-foreground">{expected != null ? `₦${expected.toLocaleString()}` : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Debited</p>
                <p className="font-heading font-bold text-foreground">{row.debit_ngn != null ? `₦${row.debit_ngn.toLocaleString()}` : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Δ</p>
                <p className={`font-heading font-bold ${diff === 0 ? 'text-emerald-600' : diff == null ? 'text-muted-foreground' : 'text-amber-600'}`}>
                  {diff == null ? '—' : `${diff > 0 ? '+' : ''}₦${diff.toLocaleString()}`}
                </p>
              </div>
            </div>
            <p className="text-[11px] mt-2 text-foreground/80">{row.note}</p>
          </div>

          <section>
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Subscription renewal</p>
            {row.renewal ? (
              <div className="rounded-xl ring-1 ring-border divide-y divide-border overflow-hidden">
                {renewalFields.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 px-3 py-1.5 text-[11px]">
                    <span className="text-muted-foreground col-span-1">{k}</span>
                    <span className="col-span-2 font-mono text-foreground break-all">{fmt(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic px-1">No renewal record found in range.</p>
            )}
          </section>

          <section>
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Wallet debit</p>
            {row.debit ? (
              <div className="rounded-xl ring-1 ring-border divide-y divide-border overflow-hidden">
                {debitFields.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 px-3 py-1.5 text-[11px]">
                    <span className="text-muted-foreground col-span-1">{k}</span>
                    <span className="col-span-2 font-mono text-foreground break-all">{fmt(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic px-1">No matching wallet_transactions debit found (checked exact subscription_id and ±48h window).</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}