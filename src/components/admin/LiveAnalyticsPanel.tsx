import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Activity, Users, MapPin, Wallet, Gift, MessageSquare, TrendingUp, Globe, Briefcase, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';

type TickerEvent = {
  id: string;
  icon: 'user' | 'business' | 'rider' | 'postcode' | 'referral' | 'withdrawal' | 'message' | 'insight';
  text: string;
  ts: number;
};

const ICONS: Record<TickerEvent['icon'], any> = {
  user: Users, business: Briefcase, rider: Activity, postcode: MapPin,
  referral: Gift, withdrawal: Wallet, message: MessageSquare, insight: TrendingUp,
};

function fmtMoney(n: number) {
  return '₦' + Math.round(n).toLocaleString();
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function last7Buckets(): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    out.push({
      date: dayKey(d),
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
    });
  }
  return out;
}

export default function LiveAnalyticsPanel({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0, riders: 0, businesses: 0, postcodes: 0, postcodesToday: 0,
    deliveriesToday: 0, deliveriesWeek: 0, deliveryRevenueToday: 0, deliveryRevenueWeek: 0,
    pendingWithdrawals: 0, pendingWithdrawAmount: 0, completedWithdrawAmount: 0,
    totalReferrals: 0, totalReferralEarned: 0,
    contactUnread: 0, contactTotal: 0,
  });
  const [signupsSeries, setSignupsSeries] = useState<any[]>([]);
  const [postcodeSeries, setPostcodeSeries] = useState<any[]>([]);
  const [topStates, setTopStates] = useState<{ label: string; count: number }[]>([]);
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [now, setNow] = useState(Date.now());
  const seenRef = useRef<Set<string>>(new Set());

  const pushEvent = (ev: TickerEvent) => {
    if (seenRef.current.has(ev.id)) return;
    seenRef.current.add(ev.id);
    setEvents((prev) => [ev, ...prev].slice(0, 60));
  };

  const loadAll = async () => {
    setLoading(true);
    const buckets = last7Buckets();
    const weekStart = new Date(); weekStart.setUTCDate(weekStart.getUTCDate() - 6); weekStart.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);

    const [
      usersCountRes, ridersCountRes, businessCountRes, ridersRecentRes, postcodesAllRes, postcodesWeekRes, deliveriesWeekRes,
      withdrawalsRes, referralsAggRes, contactRes,
    ] = await Promise.all([
      supabase.from('riders').select('id', { count: 'exact', head: true }).eq('account_type', 'individual'),
      supabase.from('riders').select('id', { count: 'exact', head: true }).eq('account_type', 'rider'),
      supabase.from('riders').select('id', { count: 'exact', head: true }).eq('account_type', 'business'),
      supabase.from('riders').select('id, account_type, created_at').gte('created_at', weekStart.toISOString()).limit(5000),
      supabase.from('postcodes').select('id', { count: 'exact', head: true }),
      supabase.from('postcodes').select('id, state, created_at').gte('created_at', weekStart.toISOString()).limit(5000),
      supabase.from('delivery_trackings').select('status, delivery_fee, created_at').gte('created_at', weekStart.toISOString()).limit(5000),
      (supabase as any).from('withdrawals').select('amount, status').limit(5000),
      supabase.from('device_referrals').select('total_referrals, total_earned').limit(5000),
      supabase.from('contact_messages').select('status', { count: 'exact' }),
    ]);

    const userCount = usersCountRes.count || 0;
    const riderCount = ridersCountRes.count || 0;
    const businessCount = businessCountRes.count || 0;
    const ridersRecent = ridersRecentRes.data || [];

    // Signups per day
    const signupMap: Record<string, number> = {};
    buckets.forEach(b => signupMap[b.date] = 0);
    ridersRecent.forEach((r: any) => {
      const k = dayKey(new Date(r.created_at));
      if (k in signupMap) signupMap[k]++;
    });
    setSignupsSeries(buckets.map(b => ({ name: b.label, value: signupMap[b.date] })));

    // Postcodes per day + today + top states
    const pcMap: Record<string, number> = {};
    buckets.forEach(b => pcMap[b.date] = 0);
    const stateMap: Record<string, number> = {};
    let pcToday = 0;
    (postcodesWeekRes.data || []).forEach((p: any) => {
      const k = dayKey(new Date(p.created_at));
      if (k in pcMap) pcMap[k]++;
      if (new Date(p.created_at) >= todayStart) pcToday++;
      const s = (p.state || 'Unknown').trim();
      stateMap[s] = (stateMap[s] || 0) + 1;
    });
    setPostcodeSeries(buckets.map(b => ({ name: b.label, value: pcMap[b.date] })));
    setTopStates(Object.entries(stateMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, count]) => ({ label, count })));

    // Deliveries
    let dToday = 0, dWeek = 0, revToday = 0, revWeek = 0;
    (deliveriesWeekRes.data || []).forEach((d: any) => {
      const t = new Date(d.created_at);
      const fee = Number(d.delivery_fee) || 0;
      dWeek++; revWeek += fee;
      if (t >= todayStart) { dToday++; revToday += fee; }
    });

    // Withdrawals
    let pendingCount = 0, pendingAmt = 0, completedAmt = 0;
    (withdrawalsRes.data || []).forEach((w: any) => {
      const a = Number(w.amount) || 0;
      if (w.status === 'pending') { pendingCount++; pendingAmt += a; }
      else if (w.status === 'completed') completedAmt += a;
    });

    // Referrals
    let refTotal = 0, refEarned = 0;
    (referralsAggRes.data || []).forEach((r: any) => {
      refTotal += Number(r.total_referrals) || 0;
      refEarned += Number(r.total_earned) || 0;
    });

    const contactTotal = contactRes.count || 0;
    const contactUnread = (contactRes.data || []).filter((c: any) => c.status === 'unread').length;

    setStats({
      users: userCount, riders: riderCount, businesses: businessCount,
      postcodes: postcodesAllRes.count || 0, postcodesToday: pcToday,
      deliveriesToday: dToday, deliveriesWeek: dWeek,
      deliveryRevenueToday: revToday, deliveryRevenueWeek: revWeek,
      pendingWithdrawals: pendingCount, pendingWithdrawAmount: pendingAmt,
      completedWithdrawAmount: completedAmt,
      totalReferrals: refTotal, totalReferralEarned: refEarned,
      contactUnread, contactTotal,
    });

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const refresh = setInterval(loadAll, 30_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);

    // Realtime subscriptions for the ticker
    const channel = supabase
      .channel('admin-live-analytics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'riders' }, (p) => {
        const r: any = p.new;
        const isBiz = r.account_type === 'business';
        pushEvent({
          id: 'r-' + r.id,
          icon: isBiz ? 'business' : 'rider',
          text: isBiz
            ? `New business registered — ${r.business_name || r.full_name || 'Unknown'}${r.location ? ' · ' + r.location : ''}`
            : `New ${r.account_type || 'user'} signup — ${r.full_name || 'Anonymous'}${r.location ? ' · ' + r.location : ''}`,
          ts: Date.now(),
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'postcodes' }, (p) => {
        const r: any = p.new;
        pushEvent({
          id: 'p-' + r.id,
          icon: 'postcode',
          text: `New postcode generated — ${r.postcode} · ${r.state || r.country || ''}`,
          ts: Date.now(),
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'device_referral_claims' }, (p) => {
        const r: any = p.new;
        pushEvent({
          id: 'rc-' + r.id,
          icon: 'referral',
          text: `New referral credited — ${fmtMoney(Number(r.amount) || 0)} via ${r.referrer_code}`,
          ts: Date.now(),
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, (p) => {
        const r: any = p.new || p.old;
        if (!r) return;
        pushEvent({
          id: 'w-' + r.id + '-' + (r.status || ''),
          icon: 'withdrawal',
          text: p.eventType === 'INSERT'
            ? `New withdrawal request — ${fmtMoney(Number(r.amount) || 0)} · ${r.full_name || ''}`
            : `Withdrawal ${r.status} — ${fmtMoney(Number(r.amount) || 0)} · ${r.full_name || ''}`,
          ts: Date.now(),
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, (p) => {
        const r: any = p.new;
        pushEvent({
          id: 'm-' + r.id,
          icon: 'message',
          text: `New contact message — ${r.subject || '(no subject)'} from ${r.name}`,
          ts: Date.now(),
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_trackings' }, (p) => {
        const r: any = p.new;
        pushEvent({
          id: 'd-' + r.id,
          icon: 'business',
          text: `New delivery created — to ${r.to_postcode || '?'} for ${r.customer_name || 'customer'}`,
          ts: Date.now(),
        });
      })
      .subscribe();

    return () => {
      clearInterval(refresh);
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Insight events derived from stats — re-seeded periodically
  useEffect(() => {
    if (loading) return;
    const insights: TickerEvent[] = [];
    const ts = Date.now();
    insights.push({ id: 'i-rev-' + ts, icon: 'insight', text: `Today's delivery revenue: ${fmtMoney(stats.deliveryRevenueToday)} across ${stats.deliveriesToday} deliveries`, ts });
    insights.push({ id: 'i-pc-' + ts, icon: 'insight', text: `Postcodes generated today: ${stats.postcodesToday.toLocaleString()} (total ${stats.postcodes.toLocaleString()})`, ts });
    if (stats.pendingWithdrawals > 0)
      insights.push({ id: 'i-pw-' + ts, icon: 'insight', text: `${stats.pendingWithdrawals} withdrawal${stats.pendingWithdrawals === 1 ? '' : 's'} pending — ${fmtMoney(stats.pendingWithdrawAmount)} awaiting payout`, ts });
    if (stats.contactUnread > 0)
      insights.push({ id: 'i-cu-' + ts, icon: 'insight', text: `${stats.contactUnread} unread contact message${stats.contactUnread === 1 ? '' : 's'}`, ts });
    insights.push({ id: 'i-ref-' + ts, icon: 'insight', text: `Lifetime referrals: ${stats.totalReferrals.toLocaleString()} · ${fmtMoney(stats.totalReferralEarned)} credited`, ts });
    if (topStates[0])
      insights.push({ id: 'i-st-' + ts, icon: 'insight', text: `Most active state this week: ${topStates[0].label} (${topStates[0].count} postcodes)`, ts });
    insights.forEach(pushEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, topStates, loading]);

  const tickerItems = useMemo(() => {
    if (events.length === 0) return [{ id: 'idle', icon: 'insight' as const, text: 'Listening for live activity…', ts: Date.now() }];
    return events;
  }, [events]);

  // duplicate items so the marquee loop is seamless
  const marquee = [...tickerItems, ...tickerItems];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full overflow-y-auto">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <div className="bg-card rounded-2xl ring-1 ring-border shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Radio className="w-5 h-5 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-ping" />
                </div>
                <div>
                  <p className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
                    Live Analytics
                    <span className="text-[10px] uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Live</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Auto-refreshes every 30s · {new Date(now).toLocaleTimeString()}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            {/* Ticker */}
            <div className="bg-foreground text-background overflow-hidden border-b border-border">
              <div className="flex items-stretch">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground font-heading font-bold text-[11px] uppercase tracking-wider shrink-0">
                  <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-pulse" /> Live Feed
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <div className="flex gap-8 whitespace-nowrap py-2 animate-[ticker_60s_linear_infinite] hover:[animation-play-state:paused]">
                    {marquee.map((e, i) => {
                      const Icon = ICONS[e.icon];
                      return (
                        <span key={e.id + '-' + i} className="inline-flex items-center gap-2 text-[12px] font-medium">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                          {e.text}
                          <span className="text-background/40">•</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* KPI grid */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi icon={<Users className="w-4 h-4" />} label="Users" value={stats.users.toLocaleString()} />
              <Kpi icon={<Activity className="w-4 h-4" />} label="Riders" value={stats.riders.toLocaleString()} />
              <Kpi icon={<Briefcase className="w-4 h-4" />} label="Businesses" value={stats.businesses.toLocaleString()} />
              <Kpi icon={<MapPin className="w-4 h-4" />} label="Postcodes (total)" value={stats.postcodes.toLocaleString()} sub={`${stats.postcodesToday} today`} />
              <Kpi icon={<Activity className="w-4 h-4" />} label="Deliveries (7d)" value={stats.deliveriesWeek.toLocaleString()} sub={`${stats.deliveriesToday} today`} />
              <Kpi icon={<Wallet className="w-4 h-4" />} label="Revenue (7d)" value={fmtMoney(stats.deliveryRevenueWeek)} sub={`${fmtMoney(stats.deliveryRevenueToday)} today`} />
              <Kpi icon={<Wallet className="w-4 h-4" />} label="Pending Payouts" value={fmtMoney(stats.pendingWithdrawAmount)} sub={`${stats.pendingWithdrawals} request${stats.pendingWithdrawals === 1 ? '' : 's'}`} />
              <Kpi icon={<Gift className="w-4 h-4" />} label="Referral Credits" value={fmtMoney(stats.totalReferralEarned)} sub={`${stats.totalReferrals} referrals`} />
              <Kpi icon={<MessageSquare className="w-4 h-4" />} label="Contact Messages" value={stats.contactTotal.toLocaleString()} sub={`${stats.contactUnread} unread`} />
            </div>

            {/* Charts */}
            <div className="px-5 pb-5 grid md:grid-cols-2 gap-4">
              <ChartCard title="Signups · last 7 days" total={signupsSeries.reduce((s, x) => s + x.value, 0)}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={signupsSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Postcodes · last 7 days" total={postcodeSeries.reduce((s, x) => s + x.value, 0)}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={postcodeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top states this week" total={topStates.reduce((s, x) => s + x.count, 0)}>
                {topStates.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No activity yet</p>
                ) : (
                  <ul className="space-y-2 py-2">
                    {topStates.map(s => {
                      const max = topStates[0].count || 1;
                      const pct = (s.count / max) * 100;
                      return (
                        <li key={s.label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-foreground flex items-center gap-1.5"><Globe className="w-3 h-3 text-muted-foreground" />{s.label}</span>
                            <span className="text-muted-foreground tabular-nums">{s.count}</span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: pct + '%' }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ChartCard>

              <ChartCard title="Recent activity" total={events.length}>
                <ul className="divide-y divide-border max-h-[180px] overflow-y-auto -mx-1">
                  {events.length === 0 && <li className="text-xs text-muted-foreground py-6 text-center">Waiting for events…</li>}
                  {events.slice(0, 12).map(e => {
                    const Icon = ICONS[e.icon];
                    const ago = Math.max(0, Math.floor((now - e.ts) / 1000));
                    const label = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : `${Math.floor(ago / 3600)}h ago`;
                    return (
                      <li key={e.id} className="flex items-start gap-2 py-2 px-1">
                        <Icon className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground leading-snug truncate">{e.text}</p>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ChartCard>
            </div>

            {loading && <div className="px-5 pb-4 text-[11px] text-muted-foreground">Loading fresh data…</div>}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-secondary/50 rounded-xl p-3 ring-1 ring-border">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">{icon}{label}</div>
      <p className="font-heading font-bold text-foreground text-xl mt-1 leading-tight tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, total, children }: { title: string; total: number; children: React.ReactNode }) {
  return (
    <div className="bg-secondary/40 rounded-xl ring-1 ring-border p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-heading font-semibold text-foreground">{title}</p>
        <span className="text-[11px] text-muted-foreground tabular-nums">{total.toLocaleString()}</span>
      </div>
      {children}
    </div>
  );
}