import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Copy, Check, XCircle, KeyRound, AlertCircle, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const API_BASE_URL = 'https://loca8tor.com/api/v1';

type ApiKeyRow = {
  id: string;
  name: string;
  environment: 'live' | 'sandbox';
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
};

type ApiSub = {
  plan_code: string;
  status: string;
  next_renewal_at: string | null;
};

export default function ApiKeys() {
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [sub, setSub] = useState<ApiSub | null>(null);
  const [planLimit, setPlanLimit] = useState<number | null>(null);
  const [callsUsed, setCallsUsed] = useState(0);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'live' | 'sandbox'>('live');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }

    const [{ data: rider }, { data: apiSub }, { data: keyRows }] = await Promise.all([
      supabase.from('riders').select('account_type').eq('user_id', u.user.id).maybeSingle(),
      supabase.from('api_subscriptions').select('plan_code, status, next_renewal_at')
        .eq('business_user_id', u.user.id).in('status', ['active', 'past_due']).maybeSingle(),
      supabase.from('api_keys').select('id, name, environment, key_prefix, is_active, last_used_at, created_at')
        .order('created_at', { ascending: false }),
    ]);

    setAccountType((rider as any)?.account_type || null);
    setSub((apiSub as any) || null);
    setKeys((keyRows as any) || []);

    if (apiSub) {
      const [{ data: plan }, { data: counter }] = await Promise.all([
        supabase.from('subscription_plans').select('api_call_limit').eq('code', (apiSub as any).plan_code).maybeSingle(),
        supabase.from('api_usage_counters').select('calls_used')
          .eq('business_user_id', u.user.id)
          .eq('period_start', new Date().toISOString().slice(0, 8) + '01')
          .maybeSingle(),
      ]);
      setPlanLimit((plan as any)?.api_call_limit ?? null);
      setCallsUsed(Number((counter as any)?.calls_used ?? 0));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createKey = async () => {
    setCreating(true);
    const { data, error } = await supabase.rpc('create_api_key', { _name: newKeyName || 'Untitled key', _environment: newKeyEnv });
    setCreating(false);
    const d: any = data;
    if (error || d?.ok === false) {
      toast({ title: 'Could not create key', description: d?.error || error?.message, variant: 'destructive' });
      return;
    }
    setRevealedKey(d.raw_key);
    setNewKeyName('');
    load();
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? Any application using it will immediately stop working.')) return;
    setBusy(id);
    const { data, error } = await supabase.rpc('revoke_api_key', { _id: id });
    setBusy(null);
    const d: any = data;
    if (error || d?.ok === false) {
      toast({ title: 'Could not revoke key', description: d?.error || error?.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const copyKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curlExample = (key: string) =>
    `curl -X GET "${API_BASE_URL}/postcode?lat=6.60126&lng=3.35149" \\\n  -H "Authorization: Bearer ${key}"`;

  const copyCurl = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(curlExample(revealedKey));
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const isBusiness = accountType === 'business';
  const hasActivePlan = sub && sub.status === 'active';

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Link to="/billing" className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="font-heading font-bold text-foreground">API Keys</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : !isBusiness ? (
          <div className="bg-card ring-1 ring-border rounded-lg p-6 text-center space-y-2">
            <KeyRound className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="font-heading font-bold text-foreground">Business accounts only</p>
            <p className="text-xs text-muted-foreground">API keys are available for business accounts.</p>
          </div>
        ) : !sub ? (
          <div className="bg-card ring-1 ring-border rounded-lg p-6 text-center space-y-3">
            <KeyRound className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="font-heading font-bold text-foreground">No active API plan</p>
            <p className="text-xs text-muted-foreground">Subscribe to an API plan to generate keys and start making calls.</p>
            <Link to="/billing" className="inline-block bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md">
              View API plans
            </Link>
          </div>
        ) : (
          <>
            {sub.status === 'past_due' && (
              <div className="flex items-start gap-2 text-[11px] bg-destructive/10 text-destructive rounded-md p-3">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Your API subscription is past due — requests will be blocked until your wallet is topped up. <Link to="/billing" className="underline font-semibold">Fix billing</Link>
              </div>
            )}

            <div className="bg-card ring-1 ring-border rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-heading font-bold text-foreground">{sub.plan_code}</p>
              {planLimit !== null && (
                <>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, (callsUsed / planLimit) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {callsUsed.toLocaleString()} / {planLimit.toLocaleString()} calls used this month
                  </p>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-heading font-bold text-foreground">Keys</p>
              </div>

              <div className="bg-card ring-1 ring-border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name (e.g. Production)"
                    className="col-span-2 sm:col-span-1 bg-secondary rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-transparent focus:ring-primary"
                  />
                  <div className="flex gap-1 bg-secondary rounded-md p-1">
                    {(['live', 'sandbox'] as const).map((e) => (
                      <button
                        key={e}
                        onClick={() => setNewKeyEnv(e)}
                        className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded capitalize ${newKeyEnv === e ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={createKey}
                  disabled={creating || !hasActivePlan}
                  className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-heading font-bold py-2.5 rounded-md disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create key
                </button>
              </div>

              {keys.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No API keys yet.</p>
              ) : (
                <div className="space-y-2">
                  {keys.map((k) => (
                    <div key={k.id} className="bg-card ring-1 ring-border rounded-lg p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{k.name}</p>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${k.environment === 'live' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                            {k.environment}
                          </span>
                          {!k.is_active && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">Revoked</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{k.key_prefix}…</p>
                        <p className="text-[10px] text-muted-foreground">
                          {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'}
                        </p>
                      </div>
                      {k.is_active && (
                        <button
                          onClick={() => revokeKey(k.id)}
                          disabled={busy === k.id}
                          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 shrink-0"
                        >
                          {busy === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {revealedKey && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card ring-1 ring-border rounded-lg w-full max-w-md p-5 space-y-4 my-8">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <p className="font-heading font-bold text-foreground">Your new API key</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Copy it now — for security, it's shown only once and can't be retrieved again. If you lose it, revoke this key and create a new one.
            </p>
            <div className="flex items-center gap-2 bg-secondary rounded-md p-2.5">
              <code className="flex-1 text-[11px] font-mono text-foreground break-all">{revealedKey}</code>
              <button onClick={copyKey} className="p-1.5 rounded hover:bg-card shrink-0">
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </div>
            <div className="flex items-start gap-2 text-[11px] bg-destructive/10 text-destructive rounded-md p-2.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              This is a <span className="font-bold">secret key</span>, not a public/publishable one — it grants full access to your account's quota. Keep it server-side (your backend, not a browser or mobile app) and never commit it to a public repo.
            </div>

            <div className="border-t border-border pt-4 space-y-2.5">
              <p className="text-xs font-heading font-bold text-foreground">How to wire it up</p>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Base URL</p>
                <div className="flex items-center gap-2 bg-secondary rounded-md p-2">
                  <code className="flex-1 text-[11px] font-mono text-foreground">{API_BASE_URL}</code>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Authenticate every request with</p>
                <div className="flex items-center gap-2 bg-secondary rounded-md p-2">
                  <code className="flex-1 text-[11px] font-mono text-foreground">Authorization: Bearer &lt;your key&gt;</code>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Example — generate a postcode</p>
                <div className="flex items-start gap-2 bg-secondary rounded-md p-2">
                  <code className="flex-1 text-[10px] font-mono text-foreground whitespace-pre-wrap break-all">{curlExample(revealedKey)}</code>
                  <button onClick={copyCurl} className="p-1.5 rounded hover:bg-card shrink-0">
                    {copiedCurl ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <Link
                to="/api-docs"
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <BookOpen className="w-3.5 h-3.5" /> Full API docs — all endpoints & examples
              </Link>
            </div>

            <button
              onClick={() => setRevealedKey(null)}
              className="w-full bg-primary text-primary-foreground font-heading font-bold py-2.5 rounded-md text-sm"
            >
              I've saved it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
