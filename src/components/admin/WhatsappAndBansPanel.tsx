import { useEffect, useState } from 'react';
import { X, MessageSquare, Ban, Trophy, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ShareRow = { id: string; user_id: string | null; recipient_phone: string | null; ip_address: string | null; verified: boolean | null; created_at: string };
type BannedRow = { id: string; kind: string; value: string; reason: string | null; banned_user_id: string | null; created_at: string };
type TopSharer = { user_id: string; full_name: string; count: number };

export default function WhatsappAndBansPanel({ onClose, isSuperAdmin }: { onClose: () => void; isSuperAdmin: boolean }) {
  const [tab, setTab] = useState<'shares' | 'top' | 'bans'>('shares');
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [namesById, setNamesById] = useState<Record<string, string>>({});
  const [top, setTop] = useState<TopSharer[]>([]);
  const [bans, setBans] = useState<BannedRow[]>([]);

  const load = async () => {
    setLoading(true);
    const [sharesRes, bansRes] = await Promise.all([
      supabase.from('whatsapp_shares').select('id, user_id, recipient_phone, ip_address, verified, created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('banned_identifiers').select('id, kind, value, reason, banned_user_id, created_at').order('created_at', { ascending: false }).limit(500),
    ]);
    const shareRows = (sharesRes.data || []) as ShareRow[];
    const bannedRows = (bansRes.data || []) as BannedRow[];
    setShares(shareRows);
    setBans(bannedRows);

    // resolve names for both shares & bans
    const ids = new Set<string>();
    shareRows.forEach(s => s.user_id && ids.add(s.user_id));
    bannedRows.forEach(b => b.banned_user_id && ids.add(b.banned_user_id));
    if (ids.size > 0) {
      const { data: riders } = await supabase.from('riders').select('user_id, full_name, business_name').in('user_id', Array.from(ids));
      const map: Record<string, string> = {};
      (riders || []).forEach((r: any) => { map[r.user_id] = r.business_name || r.full_name || 'Unknown'; });
      setNamesById(map);
    } else {
      setNamesById({});
    }

    // compute top sharers
    const counts: Record<string, number> = {};
    shareRows.forEach(s => { if (s.user_id) counts[s.user_id] = (counts[s.user_id] || 0) + 1; });
    const list = Object.entries(counts).map(([user_id, count]) => ({ user_id, full_name: '', count }))
      .sort((a, b) => b.count - a.count).slice(0, 25);
    setTop(list);

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const removeBan = async (id: string) => {
    if (!confirm('Remove this ban entry?')) return;
    const { error } = await supabase.from('banned_identifiers').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setBans(prev => prev.filter(b => b.id !== id));
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString();

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="bg-card rounded-2xl ring-1 ring-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> WhatsApp Shares & Banned Accounts
              </p>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex border-b border-border text-xs font-medium">
              {([
                ['shares', `All Shares (${shares.length})`, MessageSquare],
                ['top', `Top Sharers (${top.length})`, Trophy],
                ['bans', `Banned (${bans.length})`, Ban],
              ] as const).map(([k, label, Icon]) => (
                <button key={k} onClick={() => setTab(k as any)}
                  className={`flex-1 px-3 py-2.5 flex items-center justify-center gap-1.5 ${tab === k ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {loading && <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>}

              {!loading && tab === 'shares' && (
                shares.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No WhatsApp shares yet</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium">User</th>
                          <th className="text-left py-2 px-2 font-medium">Recipient</th>
                          <th className="text-left py-2 px-2 font-medium">IP</th>
                          <th className="text-left py-2 px-2 font-medium">Verified</th>
                          <th className="text-left py-2 px-2 font-medium">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shares.map(s => (
                          <tr key={s.id} className="border-b border-border/50">
                            <td className="py-2 px-2 text-foreground">{(s.user_id && namesById[s.user_id]) || <span className="text-muted-foreground">—</span>}</td>
                            <td className="py-2 px-2 text-foreground tabular-nums">{s.recipient_phone || '—'}</td>
                            <td className="py-2 px-2 text-muted-foreground tabular-nums">{s.ip_address || '—'}</td>
                            <td className="py-2 px-2">{s.verified ? <span className="text-primary">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                            <td className="py-2 px-2 text-muted-foreground">{fmtDate(s.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {!loading && tab === 'top' && (
                top.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No sharers yet</p> : (
                  <ul className="space-y-2">
                    {top.map((t, i) => {
                      const max = top[0].count || 1;
                      const pct = (t.count / max) * 100;
                      return (
                        <li key={t.user_id} className="bg-secondary/40 rounded-lg p-3 ring-1 ring-border">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-foreground flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                              {namesById[t.user_id] || t.user_id.slice(0, 8)}
                            </span>
                            <span className="text-foreground tabular-nums font-bold">{t.count} share{t.count === 1 ? '' : 's'}</span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: pct + '%' }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              )}

              {!loading && tab === 'bans' && (
                bans.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No banned identifiers</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium">Kind</th>
                          <th className="text-left py-2 px-2 font-medium">Value</th>
                          <th className="text-left py-2 px-2 font-medium">Account</th>
                          <th className="text-left py-2 px-2 font-medium">Reason</th>
                          <th className="text-left py-2 px-2 font-medium">When</th>
                          {isSuperAdmin && <th className="py-2 px-2"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {bans.map(b => (
                          <tr key={b.id} className="border-b border-border/50">
                            <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive uppercase text-[10px] font-bold">{b.kind}</span></td>
                            <td className="py-2 px-2 text-foreground break-all max-w-[220px]">{b.value}</td>
                            <td className="py-2 px-2 text-foreground">{(b.banned_user_id && namesById[b.banned_user_id]) || <span className="text-muted-foreground">—</span>}</td>
                            <td className="py-2 px-2 text-muted-foreground max-w-[200px]">{b.reason || '—'}</td>
                            <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{fmtDate(b.created_at)}</td>
                            {isSuperAdmin && (
                              <td className="py-2 px-2">
                                <button onClick={() => removeBan(b.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive" title="Remove ban">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}