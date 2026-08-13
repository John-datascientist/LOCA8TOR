import { useEffect, useState } from 'react';
import { X, Download, Briefcase, Users, Bike, Search, AlertTriangle, CheckCircle2, ChevronRight, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type BizRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  business_name: string | null;
  business_code: string | null;
  email: string | null;
  phone: string | null;
  cac_number: string | null;
  location: string | null;
  state: string | null;
  postcode: string | null;
  referral_code?: string | null;
  account_type?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  worker_type?: string | null;
  vehicle_type?: string | null;
  bike_owner?: string | null;
  is_banned?: boolean | null;
  ban_reason?: string | null;
  banned_at?: string | null;
  signup_ip?: string | null;
  auto_assign_enabled?: boolean | null;
  auto_assign_radius_km?: number | null;
  trial_used?: boolean | null;
  business_size?: string | null;
  created_at: string;
};

type SubInfo = {
  plan_code: string | null;
  status: string | null;
  billing_cycle: string | null;
  current_period_end: string | null;
  next_renewal_at: string | null;
  trial_ends_at: string | null;
  next_renewal_discount_percent: number | null;
};

type PayAgg = {
  total_paid_ngn: number;
  last_paid_at: string | null;
  payment_count: number;
};

function csvCell(v: any) {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

type Mode = 'business' | 'rider' | 'individual';

const MODE_META: Record<Mode, { title: string; itemLabel: string; itemLabelPlural: string; icon: any; csvSlug: string }> = {
  business:   { title: 'Registered Businesses', itemLabel: 'business',  itemLabelPlural: 'businesses', icon: Briefcase, csvSlug: 'businesses' },
  rider:      { title: 'Registered Riders',     itemLabel: 'rider',     itemLabelPlural: 'riders',     icon: Bike,      csvSlug: 'riders' },
  individual: { title: 'Registered Users',      itemLabel: 'user',      itemLabelPlural: 'users',      icon: Users,     csvSlug: 'users' },
};

export default function BusinessAccountsPanel({
  onClose, mode = 'business', adminEmail, adminPin,
}: { onClose: () => void; mode?: Mode; adminEmail?: string; adminPin?: string }) {
  const [pausingUserId, setPausingUserId] = useState<string | null>(null);
  const [linkingRiderId, setLinkingRiderId] = useState<string | null>(null);
  const [rows, setRows] = useState<BizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [subs, setSubs] = useState<Record<string, SubInfo>>({});
  const [pays, setPays] = useState<Record<string, PayAgg>>({});
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);
  const [selected, setSelected] = useState<BizRow | null>(null);
  const [detail, setDetail] = useState<{
    delivery_count?: number;
    successful?: number;
    failed?: number;
    linked_business_name?: string | null;
    linked_business_code?: string | null;
    riders_count?: number;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const meta = MODE_META[mode];
  const isBiz = mode === 'business';
  const isRider = mode === 'rider';
  const Icon = meta.icon;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const cols = 'id,user_id,full_name,business_name,business_code,phone,cac_number,location,postcode,referral_code,created_at,account_type,subscription_status,trial_ends_at,worker_type,vehicle_type,bike_owner,is_banned,ban_reason,banned_at,signup_ip,auto_assign_enabled,auto_assign_radius_km,trial_used,business_size';
      let query = supabase
        .from('riders')
        .select(cols)
        .order('created_at', { ascending: false })
        .limit(10000);
      if (mode === 'business') {
        query = query.eq('account_type', 'business');
      } else if (mode === 'rider') {
        // Include everyone signed up as a rider/driver — approved (`rider`)
        // as well as those who signed up with a worker_type but haven't been
        // linked to a business yet (still `individual`).
        query = query.or('account_type.eq.rider,worker_type.eq.rider,worker_type.eq.driver');
      } else {
        // "Users" panel — plain individuals with no rider/driver flag.
        query = query.eq('account_type', 'individual').is('worker_type', null);
      }
      const { data } = await query;
      let list: BizRow[] = (data as any) || [];

      // Enrich with auth email (riders table doesn't store email — it lives in auth.users).
      try {
        const { data: authList } = await (supabase as any).rpc('admin_list_registered_users');
        const emailMap: Record<string, string> = {};
        ((authList as any[]) || []).forEach((u: any) => {
          if (u?.user_id && u?.email) emailMap[u.user_id] = u.email;
        });
        list = list.map(r => ({ ...r, email: r.user_id ? (emailMap[r.user_id] || null) : null }));
      } catch (e) {
        console.warn('Could not enrich accounts with email', e);
      }
      setRows(list);

      if (isBiz && list.length > 0) {
        const userIds = Array.from(new Set(list.map(r => r.user_id).filter(Boolean))) as string[];
        const [{ data: subData }, { data: payData }, { data: walletData }] = await Promise.all([
          supabase.from('business_subscriptions')
            .select('business_user_id, plan_code, status, billing_cycle, current_period_end, next_renewal_at, trial_ends_at, next_renewal_discount_percent')
            .in('business_user_id', userIds),
          supabase.from('subscription_payments')
            .select('user_id, amount_ngn, status, paid_at')
            .in('user_id', userIds),
          supabase.from('wallet_transactions')
            .select('business_user_id, amount, type, status, description, subscription_id, created_at')
            .in('business_user_id', userIds)
            .eq('type', 'debit')
            .eq('status', 'successful'),
        ]);
        const sMap: Record<string, SubInfo> = {};
        ((subData as any[]) || []).forEach((s: any) => { sMap[s.business_user_id] = s; });
        setSubs(sMap);

        const pMap: Record<string, PayAgg> = {};
        ((payData as any[]) || []).forEach((p: any) => {
          if (p.status !== 'paid') return;
          const cur = pMap[p.user_id] || { total_paid_ngn: 0, last_paid_at: null, payment_count: 0 };
          cur.total_paid_ngn += Number(p.amount_ngn || 0);
          cur.payment_count += 1;
          if (!cur.last_paid_at || (p.paid_at && p.paid_at > cur.last_paid_at)) {
            cur.last_paid_at = p.paid_at;
          }
          pMap[p.user_id] = cur;
        });
        // Wallet debits tied to a subscription (or described as "Subscription: …") count as paid renewals.
        ((walletData as any[]) || []).forEach((w: any) => {
          const isSubDebit = !!w.subscription_id || (typeof w.description === 'string' && w.description.toLowerCase().startsWith('subscription'));
          if (!isSubDebit) return;
          const cur = pMap[w.business_user_id] || { total_paid_ngn: 0, last_paid_at: null, payment_count: 0 };
          cur.total_paid_ngn += Number(w.amount || 0);
          cur.payment_count += 1;
          if (!cur.last_paid_at || (w.created_at && w.created_at > cur.last_paid_at)) {
            cur.last_paid_at = w.created_at;
          }
          pMap[w.business_user_id] = cur;
        });
        setPays(pMap);
      }

      setLoading(false);
    })();
  }, [mode]);

  const openDetail = async (row: BizRow) => {
    setSelected(row);
    setDetail(null);
    setLoadingDetail(true);
    try {
      if (mode === 'business') {
        const { count } = await supabase
          .from('business_riders')
          .select('id', { count: 'exact', head: true })
          .eq('business_user_id', row.id);
        const { data: delAgg } = await supabase
          .from('delivery_trackings')
          .select('status')
          .eq('business_user_id', row.id)
          .limit(10000);
        const rows = (delAgg as any[]) || [];
        setDetail({
          riders_count: count || 0,
          delivery_count: rows.length,
          successful: rows.filter(r => r.status === 'delivered').length,
          failed: rows.filter(r => r.status === 'failed').length,
        });
      } else {
        const { data: br } = await supabase
          .from('business_riders')
          .select('business_user_id,total_deliveries,successful_deliveries,failed_deliveries')
          .eq('linked_rider_id', row.id)
          .maybeSingle();
        let linkedName: string | null = null;
        let linkedCode: string | null = null;
        if (br?.business_user_id) {
          const { data: biz } = await supabase
            .from('riders')
            .select('business_name,business_code')
            .eq('id', br.business_user_id)
            .maybeSingle();
          linkedName = biz?.business_name || null;
          linkedCode = biz?.business_code || null;
        }
        setDetail({
          delivery_count: br?.total_deliveries || 0,
          successful: br?.successful_deliveries || 0,
          failed: br?.failed_deliveries || 0,
          linked_business_name: linkedName,
          linked_business_code: linkedCode,
        });
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const copy = async (text: string | null | undefined) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const filtered = rows.filter(r => {
    if (isBiz && onlyUnpaid) {
      const pay = r.user_id ? pays[r.user_id] : null;
      if (pay && pay.payment_count > 0) return false;
    }
    if (isBiz && onlyActive) {
      const sub = r.user_id ? subs[r.user_id] : null;
      if (!sub || !['active', 'trialing', 'trial', 'past_due'].includes((sub.status || '').toLowerCase())) return false;
    }
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [r.business_name, r.full_name, r.email, r.phone, r.business_code, r.cac_number, r.referral_code, r.location, r.state, r.postcode]
      .some(v => (v || '').toString().toLowerCase().includes(needle));
  });

  const downloadCsv = () => {
    const headers = isBiz
      ? ['Business Name','Owner','Email','Phone','Business Code','CAC Number','Referral Code','Location','State','Postcode','Sub Status','Plan','Cycle','Trial Ends','Next Renewal','Last Paid','Total Paid (NGN)','Payments','Next Renewal Discount %','Registered']
      : isRider
        ? ['Full Name','Email','Phone','Linked Business Code','Referral Code','Location','State','Postcode','Registered']
        : ['Full Name','Email','Phone','Referral Code','Location','State','Postcode','Registered'];
    const lines = [headers.map(csvCell).join(',')];
    filtered.forEach(r => {
      const sub = r.user_id ? subs[r.user_id] : null;
      const pay = r.user_id ? pays[r.user_id] : null;
      const row = isBiz
        ? [r.business_name, r.full_name, r.email, r.phone, r.business_code,
           r.cac_number, r.referral_code, r.location, r.state, r.postcode,
           sub?.status || 'none', sub?.plan_code || '', sub?.billing_cycle || '',
           sub?.trial_ends_at || r.trial_ends_at || '',
           sub?.next_renewal_at || sub?.current_period_end || '',
           pay?.last_paid_at || '',
           pay?.total_paid_ngn || 0,
           pay?.payment_count || 0,
           sub?.next_renewal_discount_percent || 0,
           new Date(r.created_at).toISOString()]
        : isRider
          ? [r.full_name, r.email, r.phone, r.business_code, r.referral_code,
             r.location, r.state, r.postcode,
             new Date(r.created_at).toISOString()]
          : [r.full_name, r.email, r.phone, r.referral_code,
             r.location, r.state, r.postcode,
             new Date(r.created_at).toISOString()];
      lines.push(row.map(csvCell).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loca8tor-${meta.csvSlug}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="bg-card rounded-2xl ring-1 ring-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <Icon className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-heading font-bold text-foreground text-sm">{meta.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? 'Loading…' : `${filtered.length} of ${rows.length} ${rows.length === 1 ? meta.itemLabel : meta.itemLabelPlural}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={downloadCsv} disabled={loading || rows.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, email, phone, CAC, postcode…"
                  className="w-full pl-9 pr-3 py-2 bg-secondary/50 rounded-lg text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
                />
              </div>
              {isBiz && (
                <div className="mt-2 space-y-1">
                  <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                    <input type="checkbox" checked={onlyActive} onChange={(e) => { setOnlyActive(e.target.checked); if (e.target.checked) setOnlyUnpaid(false); }} />
                    Show only businesses with an ACTIVE subscription (active, trial, past due)
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                    <input type="checkbox" checked={onlyUnpaid} onChange={(e) => { setOnlyUnpaid(e.target.checked); if (e.target.checked) setOnlyActive(false); }} />
                    Show only businesses that have NEVER paid a subscription
                  </label>
                </div>
              )}
            </div>

            <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
              {loading && <p className="p-6 text-sm text-muted-foreground text-center">Loading {meta.itemLabelPlural}…</p>}
              {!loading && filtered.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">No {meta.itemLabelPlural} match your search.</p>
              )}
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openDetail(r)}
                  className="w-full text-left px-5 py-3 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-foreground text-sm truncate">
                        {(isBiz ? r.business_name : r.full_name) || r.full_name || r.business_name || '—'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {isBiz && r.full_name && r.business_name ? `Owner: ${r.full_name} · ` : ''}
                        {r.email || 'no email'} · {r.phone || 'no phone'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {isBiz && r.business_code ? `Code: ${r.business_code} · ` : ''}
                        {isBiz && r.cac_number ? `CAC: ${r.cac_number} · ` : ''}
                        {isRider && r.business_code ? `Linked: ${r.business_code} · ` : ''}
                        {isRider && r.worker_type ? `${r.worker_type}${r.vehicle_type ? ` · ${r.vehicle_type}` : ''} · ` : ''}
                        {r.referral_code ? `Ref: ${r.referral_code} · ` : ''}
                        {[r.location, r.state, r.postcode].filter(Boolean).join(' · ') || '—'}
                      </p>
                      {r.is_banned && (
                        <p className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30">
                          BANNED{r.ban_reason ? ` · ${r.ban_reason}` : ''}
                        </p>
                      )}
                      {isBiz && (() => {
                        const sub = r.user_id ? subs[r.user_id] : null;
                        const pay = r.user_id ? pays[r.user_id] : null;
                        const status = sub?.status || 'none';
                        const hasPaid = (pay?.payment_count || 0) > 0;
                        const statusColor =
                          status === 'active' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' :
                          status === 'past_due' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' :
                          status === 'cancelled' ? 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' :
                          'bg-secondary text-muted-foreground ring-border';
                        return (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${statusColor}`}>
                              Sub: {status}{sub?.plan_code ? ` · ${sub.plan_code}` : ''}
                            </span>
                            {hasPaid ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                ₦{(pay?.total_paid_ngn || 0).toLocaleString()} paid ({pay?.payment_count}×)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/30 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                No payments yet
                              </span>
                            )}
                            {sub?.trial_ends_at && (
                              <span className="text-[10px] text-muted-foreground">
                                Trial ends {new Date(sub.trial_ends_at).toLocaleDateString()}
                              </span>
                            )}
                            {sub?.next_renewal_at && (
                              <span className="text-[10px] text-muted-foreground">
                                Next renewal {new Date(sub.next_renewal_at).toLocaleDateString()}
                              </span>
                            )}
                            {pay?.last_paid_at && (
                              <span className="text-[10px] text-muted-foreground">
                                Last paid {new Date(pay.last_paid_at).toLocaleDateString()}
                              </span>
                            )}
                            {(sub?.next_renewal_discount_percent || 0) > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 bg-primary/15 text-primary ring-primary/30">
                                {sub?.next_renewal_discount_percent}% referral discount queued
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative h-full overflow-y-auto">
            <div className="container max-w-2xl mx-auto px-4 py-6">
              <div className="bg-card rounded-2xl ring-1 ring-border shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent sticky top-0 bg-card z-10">
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-foreground text-sm truncate">
                      {(isBiz ? selected.business_name : selected.full_name) || selected.full_name || selected.business_name || '—'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {selected.account_type || 'unknown'}{selected.worker_type ? ` · ${selected.worker_type}` : ''}
                      {selected.is_banned ? ' · BANNED' : ''}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-secondary">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <Section title="Identity">
                    <Field label="Full name" value={selected.full_name} onCopy={copy} />
                    <Field label="Email" value={selected.email} onCopy={copy} />
                    <Field label="Phone" value={selected.phone} onCopy={copy} />
                    <Field label="User ID" value={selected.user_id} mono onCopy={copy} />
                    <Field label="Rider row ID" value={selected.id} mono onCopy={copy} />
                  </Section>

                  {isBiz && (
                    <Section title="Business">
                      <Field label="Business name" value={selected.business_name} onCopy={copy} />
                      <Field label="Business code" value={selected.business_code} mono onCopy={copy} />
                      <Field label="CAC number" value={selected.cac_number} onCopy={copy} />
                      <Field label="Business size" value={selected.business_size} />
                      <Field label="Auto-assign" value={selected.auto_assign_enabled ? `On (${selected.auto_assign_radius_km || 0} km)` : 'Off'} />
                    </Section>
                  )}

                  {isRider && (
                    <Section title="Rider / Driver">
                      <Field label="Worker type" value={selected.worker_type} />
                      <Field label="Vehicle" value={selected.vehicle_type} />
                      <Field label="Bike owner" value={selected.bike_owner} />
                      <Field label="Linked business code" value={selected.business_code || detail?.linked_business_code} mono onCopy={copy} />
                      <Field label="Linked business" value={detail?.linked_business_name} />
                      <div className="pt-2">
                        <button
                          disabled={linkingRiderId === selected.id}
                          onClick={async () => {
                            const code = prompt(
                              `${selected.business_code || detail?.linked_business_code ? 'Re-link' : 'Link'} ${selected.full_name || 'this rider'} to a business.\n\nEnter the business code:`,
                              (selected.business_code || detail?.linked_business_code || '').toString()
                            );
                            if (!code || !code.trim()) return;
                            setLinkingRiderId(selected.id);
                            const { data, error } = await (supabase as any).rpc('admin_link_rider_to_business', {
                              _rider_id: selected.id,
                              _business_code: code.trim().toUpperCase(),
                              _admin_email: adminEmail?.trim().toLowerCase() || null,
                              _admin_pin: adminPin?.trim() || null,
                            });
                            setLinkingRiderId(null);
                            if (error || !data?.ok) {
                              alert(error?.message || data?.error || 'Failed to link rider');
                              return;
                            }
                            const newCode = (data.business_code || code.trim().toUpperCase()) as string;
                            const newName = (data.business_name || null) as string | null;
                            setRows(prev => prev.map(row => row.id === selected.id ? { ...row, business_code: newCode, account_type: row.account_type === 'individual' ? 'rider' : row.account_type } : row));
                            setSelected(prev => prev ? { ...prev, business_code: newCode, account_type: prev.account_type === 'individual' ? 'rider' : prev.account_type } : prev);
                            setDetail(prev => ({ ...(prev || {}), linked_business_code: newCode, linked_business_name: newName }));
                            alert(`Linked to ${newName || newCode}`);
                          }}
                          className="w-full text-[11px] font-bold py-1.5 rounded bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50"
                        >
                          {linkingRiderId === selected.id
                            ? 'Linking…'
                            : (selected.business_code || detail?.linked_business_code)
                              ? 'Re-link to a different business code'
                              : 'Link to a business by code'}
                        </button>
                      </div>
                    </Section>
                  )}

                  <Section title="Location">
                    <Field label="Location" value={selected.location} />
                    <Field label="Postcode" value={selected.postcode} mono onCopy={copy} />
                    <Field label="Signup IP" value={selected.signup_ip} mono onCopy={copy} />
                  </Section>

                  <Section title="Referral">
                    <Field label="Referral code" value={selected.referral_code} mono onCopy={copy} />
                  </Section>

                  <Section title="Account status">
                    <Field label="Account type" value={selected.account_type} />
                    <Field label="Subscription" value={selected.subscription_status} />
                    <Field label="Trial ends" value={selected.trial_ends_at ? new Date(selected.trial_ends_at).toLocaleString() : null} />
                    <Field label="Trial used" value={selected.trial_used ? 'Yes' : 'No'} />
                    <Field label="Banned" value={selected.is_banned ? 'Yes' : 'No'} />
                    {selected.is_banned && <Field label="Ban reason" value={selected.ban_reason} />}
                    {selected.banned_at && <Field label="Banned at" value={new Date(selected.banned_at).toLocaleString()} />}
                    <Field label="Registered" value={new Date(selected.created_at).toLocaleString()} />
                  </Section>

                  {isBiz && selected.user_id && subs[selected.user_id] && (
                    <Section title="Subscription">
                      <BillingTimeline
                        signedUp={selected.created_at}
                        trialEnds={subs[selected.user_id].trial_ends_at || selected.trial_ends_at}
                        periodEnd={subs[selected.user_id].current_period_end}
                        nextRenewal={subs[selected.user_id].next_renewal_at}
                        status={subs[selected.user_id].status}
                      />
                      <Field label="Plan" value={subs[selected.user_id].plan_code} />
                      <Field label="Status" value={subs[selected.user_id].status} />
                      <Field label="Billing cycle" value={subs[selected.user_id].billing_cycle} />
                      <Field label="Period ends" value={subs[selected.user_id].current_period_end ? new Date(subs[selected.user_id].current_period_end!).toLocaleString() : null} />
                      <Field label="Next renewal" value={subs[selected.user_id].next_renewal_at ? new Date(subs[selected.user_id].next_renewal_at!).toLocaleString() : null} />
                      <Field label="Renewal discount" value={subs[selected.user_id].next_renewal_discount_percent ? `${subs[selected.user_id].next_renewal_discount_percent}%` : null} />
                      <div className="pt-2 flex gap-2">
                        {subs[selected.user_id].status === 'paused' ? (
                          <button
                            disabled={pausingUserId === selected.user_id}
                            onClick={async () => {
                              if (!selected.user_id) return;
                              if (!confirm(`Resume subscription for ${selected.business_name || selected.full_name}?\n\nRiders/drivers will be re-activated.`)) return;
                              setPausingUserId(selected.user_id);
                              const { data, error } = await (supabase as any).rpc('admin_resume_business_subscription', {
                                _business_user_id: selected.user_id,
                                _admin_email: adminEmail?.trim().toLowerCase() || null,
                                _admin_pin: adminPin?.trim() || null,
                              });
                              setPausingUserId(null);
                              if (error || !data?.ok) { alert(error?.message || data?.error || 'Failed to resume'); return; }
                              setSubs(prev => ({ ...prev, [selected.user_id!]: { ...prev[selected.user_id!], status: 'active' } }));
                              alert('Subscription resumed');
                            }}
                            className="flex-1 text-[11px] font-bold py-1.5 rounded bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 disabled:opacity-50"
                          >{pausingUserId === selected.user_id ? 'Working…' : 'Resume subscription'}</button>
                        ) : (
                          <button
                            disabled={pausingUserId === selected.user_id}
                            onClick={async () => {
                              if (!selected.user_id) return;
                              const reason = prompt(`Pause subscription for ${selected.business_name || selected.full_name}?\n\nRiders/drivers will be paused. Enter reason:`);
                              if (!reason || reason.trim().length < 3) return;
                              setPausingUserId(selected.user_id);
                              const { data, error } = await (supabase as any).rpc('admin_pause_business_subscription', {
                                _business_user_id: selected.user_id,
                                _reason: reason.trim(),
                                _admin_email: adminEmail?.trim().toLowerCase() || null,
                                _admin_pin: adminPin?.trim() || null,
                              });
                              setPausingUserId(null);
                              if (error || !data?.ok) { alert(error?.message || data?.error || 'Failed to pause'); return; }
                              setSubs(prev => ({ ...prev, [selected.user_id!]: { ...prev[selected.user_id!], status: 'paused' } }));
                              alert('Subscription paused');
                            }}
                            className="flex-1 text-[11px] font-bold py-1.5 rounded bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 disabled:opacity-50"
                          >{pausingUserId === selected.user_id ? 'Working…' : 'Pause subscription'}</button>
                        )}
                      </div>
                    </Section>
                  )}

                  {isBiz && selected.user_id && pays[selected.user_id] && (
                    <Section title="Payments">
                      <Field label="Total paid" value={`₦${(pays[selected.user_id].total_paid_ngn || 0).toLocaleString()}`} />
                      <Field label="Payment count" value={pays[selected.user_id].payment_count} />
                      <Field label="Last paid" value={pays[selected.user_id].last_paid_at ? new Date(pays[selected.user_id].last_paid_at!).toLocaleString() : null} />
                    </Section>
                  )}

                  <Section title={isBiz ? 'Fleet & deliveries' : 'Delivery stats'}>
                    {loadingDetail ? (
                      <p className="text-muted-foreground">Loading…</p>
                    ) : (
                      <>
                        {isBiz && <Field label="Linked riders" value={detail?.riders_count ?? 0} />}
                        <Field label="Total deliveries" value={detail?.delivery_count ?? 0} />
                        <Field label="Successful" value={detail?.successful ?? 0} />
                        <Field label="Failed" value={detail?.failed ?? 0} />
                      </>
                    )}
                  </Section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-secondary/30 rounded-lg ring-1 ring-border p-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  onCopy,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  onCopy?: (v: string | null | undefined) => void;
}) {
  const display = value === null || value === undefined || value === '' ? '—' : String(value);
  const canCopy = !!onCopy && display !== '—';
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-foreground text-right min-w-0 break-all ${mono ? 'font-mono' : ''}`}>
        {display}
        {canCopy && (
          <button onClick={() => onCopy?.(display)} className="ml-1.5 inline-flex align-middle text-muted-foreground hover:text-primary">
            <Copy className="w-3 h-3" />
          </button>
        )}
      </span>
    </div>
  );
}

function BillingTimeline({
  signedUp, trialEnds, periodEnd, nextRenewal, status,
}: {
  signedUp: string;
  trialEnds?: string | null;
  periodEnd?: string | null;
  nextRenewal?: string | null;
  status?: string | null;
}) {
  const now = Date.now();
  const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const rel = (d?: string | null) => {
    if (!d) return '';
    const diff = new Date(d).getTime() - now;
    const days = Math.round(diff / 86400000);
    if (Math.abs(days) < 1) {
      const hours = Math.round(diff / 3600000);
      return hours >= 0 ? `in ${hours}h` : `${Math.abs(hours)}h ago`;
    }
    return days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`;
  };
  const passed = (d?: string | null) => !!d && new Date(d).getTime() <= now;

  const trialPassed = passed(trialEnds);
  const renewalPassed = passed(nextRenewal || periodEnd);
  const nextRenewalDate = nextRenewal || periodEnd;

  const statusColor =
    status === 'active' ? 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/30' :
    status === 'trialing' ? 'bg-sky-500/15 text-sky-600 ring-sky-500/30' :
    status === 'past_due' ? 'bg-amber-500/15 text-amber-600 ring-amber-500/30' :
    status === 'paused' ? 'bg-amber-500/15 text-amber-600 ring-amber-500/30' :
    status === 'cancelled' ? 'bg-red-500/15 text-red-600 ring-red-500/30' :
    'bg-secondary text-muted-foreground ring-border';

  const steps = [
    { label: 'Signed up', date: signedUp, done: true, key: 'signup' },
    { label: 'Trial ends', date: trialEnds, done: trialPassed, key: 'trial' },
    { label: 'Next renewal', date: nextRenewalDate, done: renewalPassed, key: 'renewal' },
  ] as const;

  return (
    <div className="bg-background/60 rounded-md p-3 ring-1 ring-border/60 space-y-3 mb-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Billing timeline</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 uppercase ${statusColor}`}>{status || 'none'}</span>
      </div>
      <ol className="relative">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          const active = s.done;
          return (
            <li key={s.key} className="pl-6 pb-3 last:pb-0 relative">
              {!isLast && (
                <span className={`absolute left-[7px] top-4 bottom-0 w-px ${active ? 'bg-primary' : 'bg-border'}`} />
              )}
              <span className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full ring-2 ring-background ${active ? 'bg-primary' : 'bg-border'}`} />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-foreground">{s.label}</p>
                {s.date && <span className="text-[10px] text-muted-foreground">{rel(s.date)}</span>}
              </div>
              <p className="text-[11px] text-muted-foreground">{fmt(s.date)}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}