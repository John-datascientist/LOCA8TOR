import { useState } from 'react';
import { Loader2, X, Building2, Copy, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function FundWalletModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState<number>(5000);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState<'form' | 'details' | 'confirm' | 'submitted'>('form');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [senderNote, setSenderNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const walletCredit = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const pagaFee = Math.min(Math.ceil(walletCredit * 0.0075), 1000);
  const transferAmount = walletCredit + pagaFee;

  const submit = async () => {
    if (!amount || amount < 100) {
      toast({ title: 'Enter a valid amount', description: 'Minimum funding is ₦100.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('paga-fund-wallet', {
      body: { amount_ngn: amount },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Funding failed', description: error?.message || (data as any)?.error, variant: 'destructive' });
      return;
    }
    setResult(data);
    setStep('details');
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast({ title: 'Copied', description: text });
  };

  const submitConfirmation = async () => {
    if (!confirmChecked) {
      toast({ title: 'Confirm the transfer', description: 'Tick the box to confirm you have sent the transfer.', variant: 'destructive' });
      return;
    }
    setConfirming(true);
    // Create the pending_bank_transfers row now — only when the user confirms
    // they've actually made the transfer. This keeps abandoned funding requests
    // out of the user dashboard and admin queue.
    const { data, error } = await supabase.functions.invoke('paga-confirm-bank-transfer', {
      body: {
        reference: result.reference,
        wallet_credit_ngn: result.wallet_credit,
        paga_fee_ngn: result.paga_fee,
        amount_ngn: result.transfer_amount,
        sender_name: senderName.trim() || null,
        sender_note: senderNote.trim() || null,
      },
    });
    setConfirming(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Could not submit', description: error?.message || (data as any)?.error, variant: 'destructive' });
      return;
    }
    setStep('submitted');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
      <div className="bg-card ring-1 ring-border rounded-xl w-full max-w-md p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="font-heading font-bold text-foreground">Fund Wallet</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        {step === 'form' && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Amount (₦)</label>
              <input
                type="number" min={100} step={100} value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full mt-1 bg-secondary rounded-md px-3 py-2 text-sm font-heading font-bold text-foreground"
              />
              <div className="flex gap-2 mt-2">
                {[2000, 5000, 10000, 30000].map(v => (
                  <button key={v} onClick={() => setAmount(v)}
                    className="text-[11px] bg-secondary hover:bg-secondary/70 px-2 py-1 rounded font-semibold">
                    ₦{v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Payment method</label>
              <div className="mt-1">
                <div className="flex items-center gap-2 p-3 rounded-md text-xs font-semibold ring-1 ring-primary bg-primary/10 text-primary">
                  <Building2 className="w-4 h-4" /> Bank Transfer
                </div>
                <div className="mt-3 rounded-md bg-secondary p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Wallet credit</span>
                    <span className="font-heading font-bold text-foreground">₦{walletCredit.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Paga fee (0.75%, capped at ₦1,000)</span>
                    <span className="font-semibold text-foreground">₦{pagaFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">Exact transfer amount</span>
                    <span className="font-heading font-bold text-primary">₦{transferAmount.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Transfer the exact amount shown to avoid automatic reversal by Paga.</p>
              </div>
            </div>

            <button onClick={submit} disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-bold py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Get bank details for ₦${transferAmount.toLocaleString()}`}
            </button>
            <p className="text-[10px] text-muted-foreground text-center">Transfer to the Workerholics Solutions Paga account and quote your unique reference. Your wallet is credited after admin confirms the payment (usually within 1 hour).</p>
          </>
        )}

        {step === 'details' && result && (
          <div className="space-y-3 text-sm">
            <div className="bg-secondary rounded-md p-3 space-y-2 text-xs">
              <p className="font-bold text-foreground">Transfer to:</p>
              <Field label="Bank" value={result.method_details?.bankName} onCopy={copy} />
              <Field label="Account" value={result.method_details?.accountNumber} onCopy={copy} mono />
              <Field label="Name" value={result.method_details?.accountName} onCopy={copy} />
            </div>

            <div className="bg-primary/10 ring-1 ring-primary/40 rounded-md p-3 space-y-2 text-xs">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Quote this reference</p>
              <button onClick={() => copy(result.reference)}
                className="w-full flex items-center justify-between bg-background rounded px-3 py-2">
                <span className="font-mono font-bold text-foreground text-base">{result.reference}</span>
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
              <p className="text-[10px] text-foreground/80">
                Put this reference in the transfer narration/description. Without it we cannot match your payment.
              </p>
            </div>

            <div className="rounded-md bg-secondary p-3 space-y-1 text-xs">
              <p><span className="text-muted-foreground">Wallet credit:</span> <span className="font-bold text-foreground">₦{result.wallet_credit?.toLocaleString()}</span></p>
              <p><span className="text-muted-foreground">Paga fee:</span> <span className="font-bold text-foreground">₦{result.paga_fee?.toLocaleString()}</span></p>
              <p><span className="text-muted-foreground">Exact transfer amount:</span> <span className="font-heading font-bold text-primary">₦{result.transfer_amount?.toLocaleString()}</span></p>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Once you have made the transfer from your bank app, click below to confirm and notify our verification team.
            </p>
            <button
              onClick={() => setStep('confirm')}
              className="w-full bg-primary text-primary-foreground font-heading font-bold py-2.5 rounded-md hover:bg-primary/90"
            >
              I've made the transfer
            </button>
          </div>
        )}

        {step === 'confirm' && result && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md bg-secondary p-3 space-y-1 text-xs">
              <p className="font-heading font-bold text-foreground">Confirm your transfer</p>
              <p className="text-muted-foreground">
                Confirm that you sent{' '}
                <span className="font-bold text-foreground">₦{result.transfer_amount?.toLocaleString()}</span>{' '}
                to <span className="font-bold text-foreground">{result.method_details?.accountName}</span>{' '}
                with reference <span className="font-mono font-bold text-foreground">{result.reference}</span>.
              </p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Sender account name (as shown on your bank app)</label>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full mt-1 bg-secondary rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Note to admin (optional)</label>
              <textarea
                value={senderNote}
                onChange={(e) => setSenderNote(e.target.value)}
                rows={2}
                placeholder="Anything the admin should know about this transfer"
                className="w-full mt-1 bg-secondary rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>
                I confirm I have transferred the exact amount above and included the reference{' '}
                <span className="font-mono font-bold">{result.reference}</span> in the narration.
              </span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('details')}
                className="flex-1 bg-secondary py-2.5 rounded-md font-semibold text-sm"
              >
                Back
              </button>
              <button
                onClick={submitConfirmation}
                disabled={confirming || !confirmChecked}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-bold py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for verification'}
              </button>
            </div>
          </div>
        )}

        {step === 'submitted' && result && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-card ring-1 ring-primary/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/15 ring-1 ring-primary/40 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading font-bold text-foreground">Transfer submitted</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Awaiting admin verification
                  </p>
                </div>
              </div>
              <div className="rounded-md bg-secondary/60 divide-y divide-border text-xs">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-heading font-bold text-foreground">₦{result.transfer_amount?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono font-bold text-foreground">{result.reference}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-foreground">Awaiting verification</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your wallet will be credited automatically once admin verifies the payment (usually within 1 hour). You can close this window — you'll see the credit in your wallet history.
              </p>
            </div>
            <button onClick={onClose} className="w-full bg-primary text-primary-foreground font-heading font-bold py-2.5 rounded-md hover:bg-primary/90">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onCopy, mono }: { label: string; value?: string; onCopy: (v: string) => void; mono?: boolean }) {
  if (!value) return null;
  return (
    <button onClick={() => onCopy(value)} className="w-full flex items-center justify-between gap-2 hover:bg-background/50 rounded px-1.5 py-1 text-left">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={`${mono ? 'font-mono' : ''} font-bold text-foreground`}>{value}</span>
        <Copy className="w-3 h-3 text-muted-foreground" />
      </span>
    </button>
  );
}