import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Wallet, Phone, Wifi, Clock, XCircle, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import WhatsAppShareGate from '@/components/WhatsAppShareGate';
import { getShareGateStatus, type ShareGateStatus } from '@/lib/whatsappShare';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** Auto-format postcode: insert space after the letter+digit prefix (e.g. "LG35AB" → "LG3 5AB") */
function autoFormatPostcode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  // If already has a space, keep as-is
  if (/\s/.test(clean)) return clean;
  // Match pattern: 2-3 letters + 1 digit, then rest
  const match = clean.match(/^([A-Z]{1,3}\d)(\d[A-Z0-9]*)$/);
  if (match) return `${match[1]} ${match[2]}`;
  return clean;
}

interface WithdrawalFormProps {
  balance: number;
  onBack: () => void;
  onSubmit: (data: WithdrawalData) => Promise<boolean> | boolean;
}

export interface WithdrawalData {
  type: 'airtime' | 'data';
  fullName: string;
  phone: string;
  email: string;
  networkProvider: string;
  stateOfResidence: string;
  address: string;
  postcode: string;
  amount: number;
  status: 'pending' | 'completed';
  date: string;
}

const STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT Abuja','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nassarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
];

const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];

interface WithdrawalRecord {
  id: string;
  type: string;
  full_name: string;
  phone: string;
  email: string;
  network_provider: string;
  state_of_residence: string;
  address: string;
  postcode: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function WithdrawalForm({ balance: balanceProp, onBack, onSubmit }: WithdrawalFormProps) {
  // Prefer the authoritative backend balance once it loads; fall back to the
  // parent balance only while the request is still pending.
  const [serverBalance, setServerBalance] = useState<number | null>(null);
  const balance = serverBalance ?? (balanceProp || 0);
  const [type, setType] = useState<'airtime' | 'data'>('airtime');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneLocked, setPhoneLocked] = useState(false);
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [networkProvider, setNetworkProvider] = useState('');
  const [stateOfResidence, setStateOfResidence] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [view, setView] = useState<'form' | 'history'>('form');
  const [historyPhone, setHistoryPhone] = useState(() => {
    try { return localStorage.getItem('loca8tor-last-phone') || ''; } catch { return ''; }
  });
  const [historyRecords, setHistoryRecords] = useState<WithdrawalRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gateStatus, setGateStatus] = useState<ShareGateStatus | null>(null);
  const [showShareGate, setShowShareGate] = useState(false);
  const [todayQuizTotal, setTodayQuizTotal] = useState(0);
  const DAILY_QUIZ_LIMIT = 100;

  // Load WhatsApp share gate status
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getShareGateStatus();
      if (!cancelled) setGateStatus(s);
    })();
    return () => { cancelled = true; };
  }, []);

  // Lock email + phone to the signed-in (verified) account so each payout is
  // tied to the email and phone number used at signup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const u = data.user;
      if (u?.email) setEmail(u.email);
      setEmailVerified(!!(u?.email_confirmed_at || (u as any)?.confirmed_at));
      if (u?.id) {
        const { data: rider } = await supabase
          .from('riders')
          .select('phone, full_name')
          .eq('user_id', u.id)
          .maybeSingle();
        if (!cancelled && rider) {
          if (rider.phone) {
            // Normalize stored phone to local NG format (08XXXXXXXXX) before locking,
            // otherwise legacy 10-digit / +234 entries fail validation and the user
            // can't edit because the field is locked.
            const raw = String(rider.phone).trim().replace(/[\s-]/g, '');
            const norm = raw.startsWith('+234')
              ? '0' + raw.slice(4)
              : raw.startsWith('234')
                ? '0' + raw.slice(3)
                : raw.length === 10 && /^[7-9]\d{9}$/.test(raw)
                  ? '0' + raw
                  : raw;
            const isValidNg = /^0[7-9]\d{9}$/.test(norm);
            setPhone(norm);
            // Only lock if we have a clean, valid number. Otherwise let the user
            // correct it so withdrawals aren't permanently blocked.
            setPhoneLocked(isValidNg);
          }
          if (rider.full_name) setFullName(prev => prev || rider.full_name);
        }
      }
      setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch authoritative server-side balance whenever this form is shown.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      const { data, error } = await (supabase as any).rpc('available_quiz_balance', { _uid: user.id });
      if (!cancelled && !error && typeof data === 'number') setServerBalance(data);
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch today's quiz withdrawals total to show remaining daily allowance.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('withdrawals')
        .select('amount, source, status, created_at')
        .ilike('email', user.email)
        .gte('created_at', start.toISOString())
        .in('status', ['pending', 'completed']);
      if (cancelled || !data) return;
      const total = (data as any[])
        .filter(r => (r.source ?? 'quiz') === 'quiz')
        .reduce((s, r) => s + Number(r.amount || 0), 0);
      setTodayQuizTotal(total);
    })();
  }, [submitted]);

  // Auto-fetch history when entering history view
  useEffect(() => {
    if (view === 'history' && historyPhone.trim()) {
      fetchHistory(historyPhone);
    }
  }, [view]);


  const [validatingPostcode, setValidatingPostcode] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email || !emailVerified) {
      e.email = 'You must sign in with a verified email to withdraw';
    }
    if (!fullName.trim()) e.fullName = 'Required';
    // Accept either local format (08012345678) or international +234 format
    // (+2348012345678 or 2348012345678). Normalize to local for downstream use.
    const rawPhone = phone.trim().replace(/[\s-]/g, '');
    const normalized = rawPhone.startsWith('+234')
      ? '0' + rawPhone.slice(4)
      : rawPhone.startsWith('234')
        ? '0' + rawPhone.slice(3)
        : rawPhone;
    if (!normalized || !/^0[7-9]\d{9}$/.test(normalized)) {
      e.phone = 'Enter valid Nigerian number (e.g. 08012345678 or +2348012345678)';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter valid email';
    if (!networkProvider) e.networkProvider = 'Select a network';
    if (!stateOfResidence) e.stateOfResidence = 'Select a state';
    if (!address.trim()) e.address = 'Required';
    const pc = postcode.trim();
    if (!pc) {
      e.postcode = 'Required';
    } else if (!/\s/.test(pc)) {
      e.postcode = 'Space is required in postcode (e.g. LG3 5AB)';
    }
    const amt = Number(amount);
    if (!amt || amt < 50) e.amount = 'Minimum ₦50';
    if (amt && balance != null && amt > balance) {
      e.amount = `You can only withdraw up to ₦${balance.toLocaleString()} (your earned balance)`;
    }
    if (amt && todayQuizTotal + amt > DAILY_QUIZ_LIMIT) {
      const remaining = Math.max(0, DAILY_QUIZ_LIMIT - todayQuizTotal);
      e.amount = remaining > 0
        ? `Daily quiz withdrawal limit is ₦${DAILY_QUIZ_LIMIT}. You can withdraw up to ₦${remaining} more today.`
        : `You've reached today's ₦${DAILY_QUIZ_LIMIT} quiz withdrawal limit. Try again tomorrow.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    // Validate postcode exists in DB
    setValidatingPostcode(true);
    const pc = postcode.trim().toUpperCase();
    const { data } = await supabase
      .from('postcodes')
      .select('postcode')
      .ilike('postcode', pc)
      .limit(1);
    setValidatingPostcode(false);

    if (!data || data.length === 0) {
      setErrors(prev => ({ ...prev, postcode: 'Invalid postcode. Only postcodes generated by this app are accepted.' }));
      return;
    }

    setShowConfirm(true);
  };

  const normalizePhone = (p: string) => {
    const raw = p.trim().replace(/[\s-]/g, '');
    if (raw.startsWith('+234')) return '0' + raw.slice(4);
    if (raw.startsWith('234')) return '0' + raw.slice(3);
    return raw;
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    const normPhone = normalizePhone(phone);
    try { localStorage.setItem('loca8tor-last-phone', normPhone); } catch {}
    setHistoryPhone(normPhone);
    try {
      const saved = await onSubmit({
        type,
        fullName: fullName.trim(),
        phone: normPhone,
        email: email.trim(),
        networkProvider,
        stateOfResidence,
        address: address.trim(),
        postcode: postcode.trim(),
        amount: Number(amount),
        status: 'pending',
        date: new Date().toISOString(),
      });
      if (saved) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = async (phoneNum: string) => {
    if (!phoneNum.trim()) return;
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('phone', phoneNum.trim())
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load history', variant: 'destructive' });
    } else {
      setHistoryRecords((data || []) as WithdrawalRecord[]);
    }
    setHistoryLoading(false);
  };

  const cancelWithdrawal = async (id: string) => {
    setCancellingId(id);
    const { error } = await supabase
      .from('withdrawals')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending');
    if (error) {
      toast({ title: 'Cancel failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Withdrawal cancelled' });
      setHistoryRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
    }
    setCancellingId(null);
  };

  // History view
  if (view === 'history') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('form')} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Withdrawal History</h2>
            <p className="text-xs text-muted-foreground">Search by phone number</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={historyPhone}
            onChange={e => setHistoryPhone(e.target.value)}
            placeholder="08012345678"
            type="tel"
            className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            onClick={() => fetchHistory(historyPhone)}
            disabled={historyLoading}
            className="bg-primary text-primary-foreground font-heading font-semibold text-sm px-4 py-2 rounded-lg hover:bg-primary/90 transition-all active:scale-[0.97]"
          >
            {historyLoading ? 'Loading…' : 'Search'}
          </button>
        </div>

        {historyRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No withdrawal records found</p>
        ) : (
          <div className="space-y-2">
            {historyRecords.map(r => (
              <div key={r.id} className="bg-card rounded-lg ring-1 ring-border p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-heading font-bold text-sm text-foreground">{r.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.network_provider} · {r.type}</p>
                  </div>
                  <p className="font-heading font-bold text-sm text-primary">₦{r.amount.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold capitalize ${r.status === 'pending' ? 'text-accent-foreground' : r.status === 'completed' ? 'text-primary' : 'text-destructive'}`}>
                    {r.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => cancelWithdrawal(r.id)}
                        disabled={cancellingId === r.id}
                        className="flex items-center gap-1 text-xs text-destructive font-semibold px-2 py-1 rounded-md hover:bg-destructive/10 transition-all"
                      >
                        <XCircle className="w-3 h-3" /> {cancellingId === r.id ? '…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center space-y-5 py-8">
        <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-accent-foreground" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground">Withdrawal Pending</h2>
        <p className="text-sm text-muted-foreground">Your {type} withdrawal of ₦{Number(amount).toLocaleString()} has been submitted and is <span className="font-bold text-accent-foreground">pending review</span>.</p>
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent-foreground text-xs font-semibold px-4 py-2 rounded-full">
          <Clock className="w-3.5 h-3.5" /> Awaiting admin approval
        </div>
        <button onClick={onBack} className="block mx-auto bg-primary text-primary-foreground font-heading font-semibold text-sm px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.97]">
          Back to Quiz
        </button>
      </div>
    );
  }

  // WhatsApp share gate: individuals must complete 10 unique shares first
  const gateApplies = !!gateStatus?.applies;
  const gatePassed = !!gateStatus?.gate_passed;
  if (showShareGate || (gateStatus && gateApplies && !gatePassed)) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Unlock Withdrawals</h2>
            <p className="text-xs text-muted-foreground">One-time share verification required</p>
          </div>
        </div>
        <WhatsAppShareGate
          subtitle="Share Loca8tor with 10 unique WhatsApp contacts to unlock withdrawals and referral rewards. Each share is recorded."
          onPassed={async () => {
            const s = await getShareGateStatus();
            setGateStatus(s);
            setShowShareGate(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Withdraw Earnings</h2>
            <p className="text-xs text-muted-foreground">Balance: <span className="text-primary font-bold">₦{balance.toLocaleString()}</span></p>
          </div>
        </div>
        <button
          onClick={() => setView('history')}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="w-4 h-4" /> History
        </button>
      </div>

      {/* Type selector */}
      <div className="flex gap-2 bg-secondary rounded-lg p-1">
        <button
          onClick={() => setType('airtime')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-heading font-semibold transition-all ${type === 'airtime' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Phone className="w-4 h-4" /> Airtime
        </button>
        <button
          onClick={() => setType('data')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-heading font-semibold transition-all ${type === 'data' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Wifi className="w-4 h-4" /> Data
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Scrolling promotional messages for verified quiz users */}
        {emailVerified && (
          <div className="relative overflow-hidden rounded-lg border border-primary/40 bg-primary/10 py-2">
            <div className="flex whitespace-nowrap animate-[marquee_30s_linear_infinite]">
              <span className="px-6 text-xs font-heading font-semibold text-foreground">
                📢 Share Loca8tor with friends, riders and logistics companies — earn ₦100 per referral.
              </span>
              <span className="px-6 text-xs font-heading font-semibold text-primary">
                🏆 User with the highest referrals wins ₦100,000 every month!
              </span>
              <span className="px-6 text-xs font-heading font-semibold text-foreground">
                📢 Share Loca8tor with friends, riders and logistics companies — earn ₦100 per referral.
              </span>
              <span className="px-6 text-xs font-heading font-semibold text-primary">
                🏆 User with the highest referrals wins ₦100,000 every month!
              </span>
            </div>
          </div>
        )}

        <Field label="Full Name" error={errors.fullName}>
          <input value={fullName} onChange={e => setFullName(e.target.value)} className="field-input" placeholder="John Doe" />
        </Field>
        <Field label="Phone Number" error={errors.phone}>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="field-input"
            placeholder="08012345678"
            type="tel"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Enter the phone number you want the airtime or data sent to.
          </p>
        </Field>
        <Field label="Network Provider" error={errors.networkProvider}>
          <select value={networkProvider} onChange={e => setNetworkProvider(e.target.value)} className="field-input">
            <option value="">Select network</option>
            {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Email" error={errors.email}>
          <input
            value={email}
            readOnly
            className="field-input opacity-80 cursor-not-allowed"
            placeholder={authChecked ? 'Sign in to withdraw' : 'Loading…'}
            type="email"
          />
          {authChecked && !emailVerified && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Each payout is linked to your verified account email. Sign in and verify your email to continue.
            </p>
          )}
        </Field>
        <Field label="State of Residence" error={errors.stateOfResidence}>
          <select value={stateOfResidence} onChange={e => setStateOfResidence(e.target.value)} className="field-input">
            <option value="">Select state</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Address" hint="House number & street name" error={errors.address}>
          <input value={address} onChange={e => setAddress(e.target.value)} className="field-input" placeholder="123 Example Street, Area" />
        </Field>
        <Field label="Postcode" hint='Use the "Use My Location" button to generate your postcode' error={errors.postcode}>
          <input
            value={postcode}
            onChange={e => setPostcode(autoFormatPostcode(e.target.value))}
            className="field-input"
            placeholder="LG3 5AB"
            style={{ textTransform: 'uppercase' }}
          />
        </Field>
        <Field label="Amount (₦)" error={errors.amount}>
          <input value={amount} onChange={e => setAmount(e.target.value)} className="field-input" placeholder="50" type="number" min={50} />
        </Field>

        <button
          type="submit"
          disabled={balance < 50 || validatingPostcode || submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm px-6 py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wallet className="w-4 h-4" />
          {submitting ? 'Submitting…' : validatingPostcode ? 'Validating…' : `Withdraw as ${type === 'airtime' ? 'Airtime' : 'Data'}`}
        </button>
      </form>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Withdrawal</AlertDialogTitle>
            <AlertDialogDescription>
              Withdraw ₦{Number(amount).toLocaleString()} as {type === 'airtime' ? 'Airtime' : 'Data'} to {phone || 'your number'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}{hint && <span className="text-muted-foreground font-normal ml-1">({hint})</span>}</label>
      <div className="[&_.field-input]:flex [&_.field-input]:h-10 [&_.field-input]:w-full [&_.field-input]:rounded-lg [&_.field-input]:border [&_.field-input]:border-input [&_.field-input]:bg-background [&_.field-input]:px-3 [&_.field-input]:py-2 [&_.field-input]:text-sm [&_.field-input]:ring-offset-background [&_.field-input]:placeholder:text-muted-foreground [&_.field-input]:focus-visible:outline-none [&_.field-input]:focus-visible:ring-2 [&_.field-input]:focus-visible:ring-ring [&_.field-input]:focus-visible:ring-offset-2">
        {children}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
