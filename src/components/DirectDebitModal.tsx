import { useEffect, useMemo, useState } from 'react';
import { Loader2, X, Check, Building2, AlertCircle, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Bank = { uuid: string; name: string };
type PlanInfo = { code: string; name: string; amount: number; cycle: 'monthly' | 'annual' };
type Activation = {
  referenceNumber: string;
  accountReference: string;
  activation: {
    amount: string | null;
    accountNumber: string | null;
    bankName: string | null;
  };
};

export default function DirectDebitModal({
  plan,
  defaults,
  onClose,
}: {
  plan: PlanInfo;
  defaults?: { full_name?: string; email?: string; phone?: string };
  onClose: () => void;
}) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(defaults?.full_name || '');
  const [email, setEmail] = useState(defaults?.email || '');
  const [phone, setPhone] = useState(defaults?.phone || '');
  const [address, setAddress] = useState('');
  const [bankId, setBankId] = useState('');
  const [acctNumber, setAcctNumber] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [activation, setActivation] = useState<Activation | null>(null);

  useEffect(() => {
    (async () => {
      setBanksLoading(true);
      const { data, error } = await supabase.functions.invoke('paga-collect', {
        body: { operation: 'getBanks' },
      });
      if (error || (data as any)?.error) {
        setBanksError(((data as any)?.error || error?.message || '').toString());
      } else {
        setBanks(((data as any)?.banks || []) as Bank[]);
      }
      setBanksLoading(false);
    })();
  }, []);

  const selectedBankName = useMemo(
    () => banks.find((b) => b.uuid === bankId)?.name || '',
    [banks, bankId],
  );

  const submit = async () => {
    setSubmitting(true);
    const accountReference = `LOC-${plan.code}-${Date.now()}`;
    const callBackUrl = `${window.location.origin}/billing`;
    const { data, error } = await supabase.functions.invoke('paga-collect', {
      body: {
        operation: 'createMandate',
        amount: plan.amount,
        accountReference,
        payer: {
          name: fullName,
          email,
          phoneNumber: phone,
          address,
          bankId,
          bankAccountNumber: acctNumber,
        },
        payee: { name: 'Loca8tor' },
        callBackUrl,
        expiryDateTimeUTC: '2027-12-31T00:00:00Z',
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({
        title: 'Could not start direct debit',
        description: ((data as any)?.error || error?.message || '').toString(),
        variant: 'destructive',
      });
      return;
    }
    setActivation(data as Activation);
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v).then(
      () => toast({ title: 'Copied' }),
      () => {},
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card ring-1 ring-border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <header className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-card">
          <div>
            <p className="font-heading font-bold text-foreground text-sm">
              {activation ? 'Activate your mandate' : 'Set up Direct Debit'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {plan.name} · ₦{plan.amount.toLocaleString()}/{plan.cycle === 'annual' ? 'yr' : 'mo'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </header>

        {activation ? (
          <div className="p-4 space-y-3 text-xs">
            <div className="flex items-start gap-2 bg-primary/10 rounded p-3">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Mandate created.</p>
                <p className="text-muted-foreground">
                  Send the activation amount below from your registered bank account to confirm authorisation.
                  Use your mobile-banking app, internet banking, or a bank branch — POS, USSD and ATM transfers are not accepted by NIBSS for activation.
                </p>
              </div>
            </div>
            <Field label="Amount" value={activation.activation?.amount || '—'} onCopy={copy} />
            <Field label="Bank" value={activation.activation?.bankName || '—'} onCopy={copy} />
            <Field label="Account number" value={activation.activation?.accountNumber || '—'} onCopy={copy} />
            <p className="text-[11px] text-muted-foreground">
              Once your bank confirms (usually within 4 hours — up to 7 days), your subscription will activate automatically and recurring charges will begin.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-md"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <Input label="Full name (as on bank account)" value={fullName} onChange={setFullName} placeholder="John Bull" />
            <Input label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
            <Input label="Phone" value={phone} onChange={setPhone} placeholder="08012345678" inputMode="tel" />
            <Input label="Address registered with your bank" value={address} onChange={setAddress} placeholder="176 Herbert Macaulay, Yaba" />

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Bank</label>
              {banksLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-md px-3 py-2.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading banks…
                </div>
              ) : banksError ? (
                <div className="flex items-start gap-2 text-[11px] text-destructive bg-destructive/10 rounded-md p-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Couldn't load banks: {banksError}</span>
                </div>
              ) : (
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                  <select
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-full bg-secondary rounded-md pl-8 pr-3 py-2.5 text-xs text-foreground ring-1 ring-border focus:outline-none focus:ring-primary"
                  >
                    <option value="">Select your bank…</option>
                    {banks.map((b) => (
                      <option key={b.uuid} value={b.uuid}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Input
              label="10-digit account number (NUBAN)"
              value={acctNumber}
              onChange={(v) => setAcctNumber(v.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="0123456789"
              inputMode="numeric"
            />

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-accent/10 rounded p-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                You'll be asked to transfer a small activation amount from your bank to confirm the mandate. After that, ₦{plan.amount.toLocaleString()} will be charged {plan.cycle === 'annual' ? 'yearly' : 'monthly'}.
              </span>
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Create mandate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, placeholder, type = 'text', inputMode,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; inputMode?: 'tel' | 'numeric' | 'email' | 'text';
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-muted-foreground">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-secondary rounded-md px-3 py-2.5 text-xs text-foreground ring-1 ring-border focus:outline-none focus:ring-primary"
      />
    </div>
  );
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between bg-secondary rounded-md px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-heading font-bold text-foreground truncate">{value}</p>
      </div>
      <button onClick={() => onCopy(value)} className="p-1.5 rounded hover:bg-card" aria-label={`Copy ${label}`}>
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}