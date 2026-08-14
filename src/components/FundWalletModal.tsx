import { useEffect, useState } from 'react';
import { Loader2, X, Copy, Landmark, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function FundWalletModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<{ account_number: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke('paga-register-persistent-account', {
      body: {},
    });
    setLoading(false);
    if (err || (data as any)?.error) {
      setError((data as any)?.error || err?.message || 'Could not set up your account. Please try again.');
      return;
    }
    setAccount({ account_number: (data as any).account_number });
  };

  useEffect(() => { void load(); }, []);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast({ title: 'Copied', description: text });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
      <div className="bg-card ring-1 ring-border rounded-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-heading font-bold text-foreground">Fund Wallet</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Setting up your account…</p>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm bg-destructive/10 text-destructive rounded-md p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={load} className="w-full bg-primary text-primary-foreground font-heading font-bold py-2.5 rounded-md hover:bg-primary/90">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && account && (
          <div className="space-y-3 text-sm">
            <div className="bg-secondary rounded-md p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-primary" /> Your permanent top-up account
              </p>
              <button onClick={() => copy(account.account_number)}
                className="w-full flex items-center justify-between bg-background rounded px-3 py-2">
                <span className="font-mono font-bold text-foreground text-base">{account.account_number}</span>
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
              <p className="text-xs text-muted-foreground">Paga</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Transfer any amount to this account, anytime — your wallet is credited automatically within a few
              minutes. This account is permanently yours; no reference code needed and no waiting for confirmation.
            </p>
            <button onClick={onClose} className="w-full bg-primary text-primary-foreground font-heading font-bold py-2.5 rounded-md hover:bg-primary/90">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
