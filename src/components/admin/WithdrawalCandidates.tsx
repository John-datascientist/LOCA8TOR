import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, RefreshCw, Send, X, Wallet, Copy, AlertCircle } from 'lucide-react';

interface Candidate {
  user_id: string;
  email: string;
  email_verified: boolean;
  full_name: string | null;
  phone: string | null;
  referral_balance: number;
  total_earned: number;
  withdrawal_count: number;
  last_withdrawal_at: string | null;
  last_withdrawal_status: string | null;
  last_full_name: string | null;
  last_phone: string | null;
  last_network: string | null;
  last_state: string | null;
  last_address: string | null;
  last_postcode: string | null;
  last_type: string | null;
}

function formatPostcode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  if (/\s/.test(clean)) return clean;
  const m = clean.match(/^([A-Z]{1,3}\d)(\d[A-Z0-9]*)$/);
  return m ? `${m[1]} ${m[2]}` : clean;
}

export default function WithdrawalCandidates() {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [minBalance, setMinBalance] = useState(50);
  const [onlyWithHistory, setOnlyWithHistory] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Candidate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('admin_list_withdrawal_candidates', {
      _min_balance: minBalance,
      _only_with_history: onlyWithHistory,
      _limit: 500,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Could not load candidates', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((data || []) as Candidate[]);
  }, [minBalance, onlyWithHistory]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      r.email?.toLowerCase().includes(q) ||
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.phone || '').includes(q) ||
      (r.last_postcode || '').toLowerCase().includes(q)
    );
  });

  return (
    <section className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Initiate Withdrawal
          </p>
          <p className="text-[11px] text-muted-foreground">
            Verified users you can reach out to or create a pending withdrawal for
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-[11px] text-muted-foreground space-y-1">
          <span>Min referral balance (₦)</span>
          <input
            type="number"
            value={minBalance}
            onChange={e => setMinBalance(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-[11px] text-muted-foreground space-y-1">
          <span>Search</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="email, name, phone, postcode"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground self-end pb-1.5">
          <input
            type="checkbox"
            checked={onlyWithHistory}
            onChange={e => setOnlyWithHistory(e.target.checked)}
          />
          Only users with prior withdrawal history
        </label>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Showing {filtered.length} of {rows.length}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No candidates match</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map(r => (
            <CandidateRow key={r.user_id} c={r} onInitiate={() => setEditing(r)} />
          ))}
        </div>
      )}

      {editing && (
        <InitiateWithdrawalModal
          candidate={editing}
          onClose={() => setEditing(null)}
          onCreated={() => { setEditing(null); load(); }}
        />
      )}
    </section>
  );
}

function CandidateRow({ c, onInitiate }: { c: Candidate; onInitiate: () => void }) {
  const copy = (v: string) => {
    navigator.clipboard.writeText(v).then(() => toast({ title: 'Copied' }));
  };
  return (
    <div className="bg-secondary/30 rounded-md ring-1 ring-border/60 p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-bold text-foreground truncate">
            {c.full_name || c.last_full_name || '(no name)'}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            <button onClick={() => copy(c.email)} className="hover:underline">{c.email}</button>
            {c.phone && (
              <> · <button onClick={() => copy(c.phone!)} className="hover:underline">{c.phone}</button></>
            )}
          </p>
          {c.last_withdrawal_at && (
            <p className="text-[10px] text-muted-foreground">
              Last withdrawal: {new Date(c.last_withdrawal_at).toLocaleDateString()} · {c.last_withdrawal_status} ·{' '}
              {c.last_network} {c.last_type} → {c.last_postcode}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-heading font-bold text-primary text-sm">₦{c.referral_balance.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">earned ₦{c.total_earned.toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
        <span className="text-[10px] text-muted-foreground">{c.withdrawal_count} prior · {c.email_verified ? 'verified' : 'unverified'}</span>
        <div className="flex items-center gap-1">
          <a
            href={`mailto:${c.email}?subject=Loca8tor%20withdrawal&body=Hi%20${encodeURIComponent(c.full_name || '')},%0A%0AWe%20noticed%20your%20recent%20withdrawal%20attempt%20may%20not%20have%20gone%20through.%20Please%20resubmit%20from%20the%20app%20so%20we%20can%20process%20it.`}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70"
          >
            <Send className="w-3 h-3" /> Email
          </a>
          <button
            onClick={onInitiate}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Wallet className="w-3 h-3" /> Initiate
          </button>
        </div>
      </div>
    </div>
  );
}

function InitiateWithdrawalModal({
  candidate, onClose, onCreated,
}: { candidate: Candidate; onClose: () => void; onCreated: () => void }) {
  const c = candidate;
  const [type, setType] = useState<'airtime' | 'data'>((c.last_type as any) || 'airtime');
  const [fullName, setFullName] = useState(c.full_name || c.last_full_name || '');
  const [phone, setPhone] = useState(c.phone || c.last_phone || '');
  const [network, setNetwork] = useState(c.last_network || 'MTN');
  const [state, setState] = useState(c.last_state || '');
  const [address, setAddress] = useState(c.last_address || '');
  const [postcode, setPostcode] = useState(c.last_postcode || '');
  const [amount, setAmount] = useState<number>(Math.max(50, c.referral_balance || 50));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!fullName.trim() || !phone.trim() || !state.trim() || !address.trim() || !postcode.trim()) {
      toast({ title: 'Fill all fields', variant: 'destructive' });
      return;
    }
    if (!amount || amount < 50) {
      toast({ title: 'Amount must be at least ₦50', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('admin_create_pending_withdrawal', {
      _email: c.email,
      _type: type,
      _full_name: fullName.trim(),
      _phone: phone.trim(),
      _network_provider: network,
      _state_of_residence: state.trim(),
      _address: address.trim(),
      _postcode: formatPostcode(postcode.trim()),
      _amount: amount,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not create withdrawal', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Pending withdrawal created', description: `ID ${String(data).slice(0, 8)}…` });
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl shadow-2xl ring-1 ring-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
          <div>
            <p className="font-heading font-bold text-sm text-foreground">Initiate Withdrawal</p>
            <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2 bg-secondary rounded-lg p-1">
            {(['airtime', 'data'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-md text-xs font-heading font-semibold capitalize ${type === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                {t}
              </button>
            ))}
          </div>
          <Field label="Full name"><input value={fullName} onChange={e => setFullName(e.target.value)} className="field" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} className="field" type="tel" /></Field>
            <Field label="Network">
              <select value={network} onChange={e => setNetwork(e.target.value)} className="field">
                {['MTN', 'Airtel', 'Glo', '9mobile'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>
          <Field label="State"><input value={state} onChange={e => setState(e.target.value)} className="field" /></Field>
          <Field label="Address"><input value={address} onChange={e => setAddress(e.target.value)} className="field" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Postcode"><input value={postcode} onChange={e => setPostcode(formatPostcode(e.target.value))} className="field uppercase" /></Field>
            <Field label="Amount (₦)"><input type="number" min={50} value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} className="field" /></Field>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-accent/10 rounded-md p-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-accent-foreground" />
            <span>This creates a pending withdrawal row on the user's behalf. It will appear in the Pending list above where you can mark it Completed after fulfilling.</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-md bg-secondary text-xs font-semibold">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Pending'}
            </button>
          </div>
        </div>
        <style>{`.field{display:flex;height:36px;width:100%;border-radius:6px;border:1px solid hsl(var(--input));background:hsl(var(--background));padding:0 10px;font-size:13px;color:hsl(var(--foreground))}.field.uppercase{text-transform:uppercase}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}