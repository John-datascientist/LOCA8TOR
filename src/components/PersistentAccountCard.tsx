import { useEffect, useState } from 'react';
import { Landmark, Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type PagaAccount = { account_number: string; account_reference: string };

export default function PersistentAccountCard() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<PagaAccount | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_paga_accounts' as any)
      .select('account_number, account_reference')
      .maybeSingle();
    setAccount((data as any) || null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast({ title: 'Copied', description: text });
  };

  const create = async () => {
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('paga-register-persistent-account', {
      body: {},
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Could not create account', description: (data as any)?.error || error?.message || 'Please try again.', variant: 'destructive' });
      return;
    }
    setAccount({ account_number: (data as any).account_number, account_reference: (data as any).account_reference });
    toast({ title: 'Account created', description: 'Your permanent top-up account is ready.' });
  };

  if (loading) {
    return (
      <div className="bg-card ring-1 ring-border rounded-lg p-4 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (account) {
    return (
      <div className="bg-card ring-1 ring-border rounded-lg p-4 space-y-2">
        <p className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
          <Landmark className="w-4 h-4 text-primary" /> Your permanent top-up account
        </p>
        <button onClick={() => copy(account.account_number)}
          className="w-full flex items-center justify-between bg-secondary rounded-md px-3 py-2">
          <span className="font-mono font-bold text-foreground">{account.account_number}</span>
          <Copy className="w-4 h-4 text-muted-foreground" />
        </button>
        <p className="text-[11px] text-muted-foreground">
          Paga · Transfer any amount, anytime — your wallet is credited automatically, no reference code needed.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card ring-1 ring-border rounded-lg p-4 space-y-3">
      <p className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
        <Landmark className="w-4 h-4 text-primary" /> Get a permanent top-up account
      </p>
      <p className="text-[11px] text-muted-foreground">
        Set up a dedicated bank account number just for you — transfer to it anytime and your wallet is credited
        automatically, without a reference code or waiting for admin confirmation.
      </p>
      <button onClick={create} disabled={creating}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-bold text-xs py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-50">
        {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Set up my account'}
      </button>
    </div>
  );
}
