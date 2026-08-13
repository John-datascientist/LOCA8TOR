import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Notif = { id: string; title: string; body: string; kind: string; created_at: string; read_at: string | null };

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('user_notifications')
      .select('id,title,body,kind,created_at,read_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setItems(data as Notif[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const uid = data.user?.id || null;
      setUserId(uid);
      if (uid) load(uid);
    });
    return () => { cancelled = true; };
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user-notifs-${userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` },
        () => load(userId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const unread = items.filter(i => !i.read_at).length;

  const markAll = async () => {
    if (!userId) return;
    const ids = items.filter(i => !i.read_at).map(i => i.id);
    if (ids.length === 0) return;
    await supabase.from('user_notifications').update({ read_at: new Date().toISOString() } as never).in('id', ids);
    load(userId);
  };

  const markOne = async (id: string) => {
    if (!userId) return;
    await supabase.from('user_notifications').update({ read_at: new Date().toISOString() } as never).eq('id', id);
    load(userId);
  };

  if (!userId) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[min(92vw,340px)] bg-card ring-1 ring-border rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <p className="text-sm font-heading font-bold text-foreground">Notifications</p>
              {unread > 0 && (
                <button onClick={markAll} className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {items.length === 0 && (
                <li className="p-6 text-xs text-muted-foreground text-center">You're all caught up.</li>
              )}
              {items.map(n => (
                <li key={n.id} className={`p-3 ${n.read_at ? '' : 'bg-primary/5'}`}>
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read_at ? 'bg-transparent' : 'bg-primary'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-heading font-bold text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug whitespace-pre-wrap break-words">{n.body}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                        {!n.read_at && (
                          <button onClick={() => markOne(n.id)} className="text-[10px] text-primary hover:underline inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}