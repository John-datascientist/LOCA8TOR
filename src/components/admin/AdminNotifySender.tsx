import { useState } from 'react';
import { X, Send, Users, Briefcase, Bike, Megaphone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Audience = 'all' | 'individual' | 'rider' | 'business';

const AUDIENCES: { value: Audience; label: string; icon: any; hint: string }[] = [
  { value: 'all',        label: 'Everyone',        icon: Megaphone, hint: 'All registered accounts' },
  { value: 'individual', label: 'Users',           icon: Users,     hint: 'Individuals only' },
  { value: 'rider',      label: 'Riders / Drivers',icon: Bike,      hint: 'Rider & driver accounts' },
  { value: 'business',   label: 'Businesses',      icon: Briefcase, hint: 'Business accounts' },
];

const KINDS = ['info', 'success', 'warning', 'alert'];

export default function AdminNotifySender({
  onClose, adminEmail, adminPin,
}: { onClose: () => void; adminEmail: string; adminPin: string }) {
  const [audience, setAudience] = useState<Audience>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('info');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null); setResult(null);
    if (!title.trim() || !body.trim()) { setError('Title and message are required.'); return; }
    setSending(true);
    const useStaff = adminEmail.trim() && adminPin.trim().length === 7;
    const { data, error } = await (supabase as any).rpc('admin_broadcast_notification', {
      _admin_email: useStaff ? adminEmail.trim().toLowerCase() : null,
      _admin_pin:   useStaff ? adminPin.trim() : null,
      _audience: audience,
      _title: title.trim(),
      _body:  body.trim(),
      _kind:  kind,
    });
    setSending(false);
    if (error) { setError(error.message || 'Failed to send'); return; }
    setResult({ sent: (data as any)?.sent ?? 0 });
    setTitle(''); setBody('');
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full overflow-y-auto">
        <div className="container max-w-lg mx-auto px-4 py-6">
          <div className="bg-card rounded-2xl ring-1 ring-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-heading font-bold text-foreground text-sm">Send Notification</p>
                  <p className="text-[11px] text-muted-foreground">Broadcasts an in-app notification to the selected audience</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Audience</p>
                <div className="grid grid-cols-2 gap-2">
                  {AUDIENCES.map(a => {
                    const Icon = a.icon;
                    const active = audience === a.value;
                    return (
                      <button key={a.value} onClick={() => setAudience(a.value)}
                        className={`text-left rounded-lg p-3 ring-1 transition-colors ${active ? 'bg-primary/15 ring-primary text-foreground' : 'bg-secondary/40 ring-border hover:bg-secondary text-foreground'}`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-xs font-heading font-bold">{a.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{a.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
                  placeholder="e.g. New feature: live map"
                  className="mt-1 w-full px-3 py-2 bg-secondary/50 rounded-lg text-sm ring-1 ring-border focus:outline-none focus:ring-primary" />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Message</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={1000} rows={4}
                  placeholder="Write the notification message users will see…"
                  className="mt-1 w-full px-3 py-2 bg-secondary/50 rounded-lg text-sm ring-1 ring-border focus:outline-none focus:ring-primary resize-none" />
                <p className="text-[10px] text-muted-foreground text-right mt-1">{body.length}/1000</p>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Type</label>
                <div className="mt-1 flex gap-2 flex-wrap">
                  {KINDS.map(k => (
                    <button key={k} onClick={() => setKind(k)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold ring-1 ${kind === k ? 'bg-primary text-primary-foreground ring-primary' : 'bg-secondary text-muted-foreground ring-border'}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              {result && (
                <div className="rounded-lg bg-primary/10 ring-1 ring-primary/30 p-3 text-xs text-foreground">
                  ✅ Delivered to <span className="font-bold">{result.sent.toLocaleString()}</span> recipient{result.sent === 1 ? '' : 's'}.
                </div>
              )}

              <button onClick={send} disabled={sending}
                className="w-full h-10 bg-primary text-primary-foreground text-sm font-semibold rounded-lg disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send notification</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}