import { useEffect, useState } from 'react';
import { Loader2, Check, X as XIcon, RefreshCw, Copy, Undo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Row = {
  id: string;
  user_id: string;
  reference_code: string;
  amount_ngn: number;
  wallet_credit_ngn: number;
  paga_fee_ngn: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'recalled';
  admin_note: string | null;
  created_at: string;
  confirmed_at: string | null;
};

type UserInfo = { user_id: string; full_name: string | null; phone: string | null; business_name: string | null; email: string | null };

export default function PendingTransfersPanel() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const load = async () => {
    setLoading(true);
    const q = supabase.from('pending_bank_transfers').select('*').order('created_at', { ascending: false }).limit(100);
    const { data } = tab === 'pending'
      ? await q.eq('status', 'pending')
      : await q.in('status', ['confirmed', 'rejected', 'recalled']);
    const list = (data || []) as Row[];
    setRows(list);
    const ids = Array.from(new Set(list.map(r => r.user_id)));
    if (ids.length) {
      // Prefer the admin RPC: it joins auth.users + riders so we always get
      // an email/name even for users without a riders row.
      const { data: brief } = await (supabase as any).rpc('admin_get_user_brief', { _user_ids: ids });
      const map: Record<string, UserInfo> = {};
      (brief || []).forEach((r: any) => { map[r.user_id] = r; });
      // Fallback: if RPC fails (e.g. non-admin context), use plain riders lookup.
      if (!brief || brief.length === 0) {
        const { data: rs } = await supabase.from('riders').select('user_id, full_name, phone, business_name').in('user_id', ids);
        (rs || []).forEach((r: any) => { map[r.user_id] = { ...r, email: null }; });
      }
      setUsers(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const act = async (row: Row, action: 'confirm' | 'reject' | 'recall') => {
    if (action === 'reject' && !noteText.trim()) {
      toast({ title: 'Add a note', description: 'Please add a reason before rejecting.', variant: 'destructive' });
      return;
    }
    if (action === 'recall') {
      const ok = window.confirm(`Recall confirmed transfer ${row.reference_code}? This will DEBIT ₦${Number(row.wallet_credit_ngn).toLocaleString()} from the user's wallet.`);
      if (!ok) return;
    }
    setBusy(row.id);
    const { data, error } = await supabase.functions.invoke('admin-confirm-bank-transfer', {
      body: { transfer_id: row.id, action, note: noteText.trim() || null },
    });
    setBusy(null);
    if (error || (data as any)?.error) {
      toast({ title: 'Action failed', description: error?.message || (data as any)?.error, variant: 'destructive' });
      return;
    }
    toast({
      title: action === 'confirm' ? 'Wallet credited' : action === 'recall' ? 'Payment recalled' : 'Transfer rejected',
      description: `Reference ${row.reference_code}`,
    });
    setNoteFor(null); setNoteText('');
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast({ title: 'Copied', description: text });
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading font-semibold text-sm text-foreground">Bank Transfer Funding</p>
          <p className="text-[11px] text-muted-foreground">Confirm Paga transfers and credit wallets</p>
        </div>
        <button onClick={load} className="p-1.5 rounded-md hover:bg-secondary"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex gap-1 bg-secondary rounded-md p-1">
        {(['pending', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded text-xs font-semibold capitalize ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No {tab === 'pending' ? 'pending transfers' : 'history'} yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(r => {
            const u = users[r.user_id];
            const open = noteFor === r.id;
            return (
              <div key={r.id} className="bg-secondary/40 rounded-md p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{u?.business_name || u?.full_name || 'Unknown user'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u?.email || u?.phone || r.user_id}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    r.status === 'pending' ? 'bg-accent/20 text-accent-foreground' :
                    r.status === 'confirmed' ? 'bg-primary/15 text-primary' :
                    r.status === 'recalled' ? 'bg-destructive/15 text-destructive' :
                    'bg-destructive/15 text-destructive'
                  }`}>{r.status.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-muted-foreground">Wallet credit</p>
                    <p className="font-heading font-bold text-foreground">₦{Number(r.wallet_credit_ngn).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Transfer amount</p>
                    <p className="font-heading font-bold text-foreground">₦{Number(r.amount_ngn).toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => copy(r.reference_code)} className="w-full flex items-center justify-between text-[11px] bg-card rounded px-2 py-1.5">
                  <span className="font-mono font-bold text-foreground">{r.reference_code}</span>
                  <Copy className="w-3 h-3 text-muted-foreground" />
                </button>
                <p className="text-[10px] text-muted-foreground">Requested {new Date(r.created_at).toLocaleString()}</p>
                {r.admin_note && <p className="text-[10px] text-muted-foreground italic">Note: {r.admin_note}</p>}

                {r.status === 'pending' && (
                  <>
                    {open && (
                      <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Optional note"
                        className="w-full text-xs bg-card rounded px-2 py-1.5 ring-1 ring-border" />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { if (!open) { setNoteFor(r.id); setNoteText(''); } else { act(r, 'confirm'); } }}
                        disabled={busy === r.id}
                        className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-md disabled:opacity-50">
                        {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        {open ? 'Confirm & credit' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => { if (!open) { setNoteFor(r.id); setNoteText(''); } else { act(r, 'reject'); } }}
                        disabled={busy === r.id}
                        className="flex-1 flex items-center justify-center gap-1 bg-destructive/15 text-destructive text-xs font-semibold py-2 rounded-md disabled:opacity-50">
                        <XIcon className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </>
                )}

                {r.status === 'confirmed' && (
                  <>
                    {open && (
                      <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Reason for recall (optional)"
                        className="w-full text-xs bg-card rounded px-2 py-1.5 ring-1 ring-border" />
                    )}
                    <button
                      onClick={() => { if (!open) { setNoteFor(r.id); setNoteText(''); } else { act(r, 'recall'); } }}
                      disabled={busy === r.id}
                      className="w-full flex items-center justify-center gap-1 bg-destructive/15 text-destructive text-xs font-semibold py-2 rounded-md disabled:opacity-50">
                      {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                      {open ? 'Recall & debit wallet' : 'Recall payment'}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}