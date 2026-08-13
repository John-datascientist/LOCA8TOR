import { useEffect, useRef, useState } from 'react';
import { Loader2, X, Building2, ExternalLink, CheckCircle2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Plan = { code: string; name: string };

export default function SubscribeCheckoutModal({
  plan, cycle, onClose, onActivated,
}: {
  plan: Plan; cycle: 'monthly' | 'annual'; onClose: () => void; onActivated: () => void;
}) {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [activated, setActivated] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      setBusy(true);
      const { data, error } = await supabase.functions.invoke('paga-subscribe', {
        body: { plan_code: plan.code, billing_cycle: cycle },
      });
      setBusy(false);
      if (error || (data as any)?.error) {
        setError(error?.message || (data as any)?.error || 'Could not start payment.');
        return;
      }
      setResult(data);
      if ((data as any)?.payment_url) {
        window.open((data as any).payment_url, '_blank', 'noopener,noreferrer');
      }
    })();
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [plan.code, cycle]);

  // Poll payment status every 5s.
  useEffect(() => {
    if (!result?.reference || activated) return;
    const tick = async () => {
      const { data } = await supabase
        .from('subscription_payments')
        .select('status')
        .eq('paga_reference', result.reference)
        .maybeSingle();
      if ((data as any)?.status === 'paid') {
        setActivated(true);
        onActivated();
      }
    };
    pollRef.current = window.setInterval(tick, 5000) as unknown as number;
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [result?.reference, activated, onActivated]);

  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast({ title: 'Copied' }); };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
      <div className="bg-card ring-1 ring-border rounded-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-heading font-bold text-foreground">Subscribe — {plan.name}</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Generating bank transfer details…
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>
        )}

        {activated && (
          <div className="space-y-3 text-center py-3">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <p className="font-heading font-bold text-foreground">Subscription active</p>
            <p className="text-xs text-muted-foreground">Payment confirmed. Your plan is now active.</p>
            <button onClick={onClose} className="w-full bg-primary text-primary-foreground font-heading font-bold py-2.5 rounded-md">Done</button>
          </div>
        )}

        {!busy && !error && !activated && result && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-xs font-semibold p-3 rounded-md ring-1 ring-primary bg-primary/10 text-primary">
              <Building2 className="w-4 h-4" /> Pay by Bank Transfer
            </div>

            <div className="rounded-md bg-secondary p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Plan amount</span>
                <span className="font-bold text-foreground">₦{result.plan_amount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Paga fee</span>
                <span className="font-semibold text-foreground">₦{result.paga_fee?.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between gap-3">
                <span className="font-semibold text-foreground">Exact transfer amount</span>
                <span className="font-heading font-bold text-primary">₦{result.transfer_amount?.toLocaleString()}</span>
              </div>
            </div>

            {result.method_details ? (
              <div className="bg-secondary rounded-md p-3 space-y-1 text-xs">
                <p className="font-bold text-foreground">Transfer to:</p>
                {result.method_details.accountNumber && (
                  <p className="flex items-center justify-between">
                    <span><span className="text-muted-foreground">Account:</span> <span className="font-mono font-bold text-foreground">{result.method_details.accountNumber}</span></span>
                    <button onClick={() => copy(result.method_details.accountNumber)} className="p-1 hover:bg-card rounded"><Copy className="w-3 h-3" /></button>
                  </p>
                )}
                {result.method_details.bankName && <p><span className="text-muted-foreground">Bank:</span> {result.method_details.bankName}</p>}
                {result.method_details.accountName && <p><span className="text-muted-foreground">Name:</span> {result.method_details.accountName}</p>}
              </div>
            ) : result.payment_url ? (
              <a href={result.payment_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-semibold py-2 rounded-md">
                Open Paga payment page <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}

            <p className="text-[10px] text-muted-foreground">
              Transfer the exact amount above to the account shown and include the reference
              <span className="font-mono font-bold text-foreground"> {result.reference} </span>
              in the transfer narration/description. Your subscription activates automatically once payment is confirmed. Keep this window open.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center py-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Waiting for payment confirmation…
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Reference: <span className="font-mono">{result.reference}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}