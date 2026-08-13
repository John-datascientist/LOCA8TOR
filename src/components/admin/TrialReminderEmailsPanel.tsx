import { useEffect, useState } from 'react';
import { X, Mail, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Row = {
  message_id: string;
  recipient_email: string | null;
  status: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
};

export default function TrialReminderEmailsPanel({
  onClose, adminEmail, adminPin,
}: { onClose: () => void; adminEmail?: string; adminPin?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setErr(null);
    const { data, error } = await (supabase as any).rpc('admin_list_trial_reminder_emails', {
      _admin_email: adminEmail?.trim().toLowerCase() || null,
      _admin_pin: adminPin?.trim() || null,
      _limit: 200,
    });
    if (error) { setErr(error.message || 'Failed to load'); setRows([]); }
    else setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const badge = (s: string | null) => {
    const cls =
      s === 'sent' ? 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/30' :
      s === 'pending' ? 'bg-sky-500/15 text-sky-600 ring-sky-500/30' :
      s === 'suppressed' ? 'bg-amber-500/15 text-amber-600 ring-amber-500/30' :
      'bg-red-500/15 text-red-600 ring-red-500/30';
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 uppercase ${cls}`}>{s || '—'}</span>;
  };

  const counts = rows.reduce((acc, r) => {
    const k = (r.status || 'unknown') as string;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-lg ring-1 ring-border p-5 max-w-3xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="font-heading font-bold text-base text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" /> Trial Reminder Emails ({rows.length})
          </p>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-1.5 rounded hover:bg-secondary" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {(['sent','pending','suppressed','dlq'] as const).map(s => (
            <div key={s} className="bg-secondary/50 rounded-lg p-2 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">{s === 'dlq' ? 'failed' : s}</p>
              <p className="text-lg font-bold text-foreground">{counts[s] || 0}</p>
            </div>
          ))}
        </div>

        {err && <p className="text-xs text-destructive mb-3">{err}</p>}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No trial reminder emails sent yet.</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map(r => {
              const biz = (r.metadata && (r.metadata.businessName || r.metadata.business_name || r.metadata?.templateData?.businessName)) || null;
              return (
                <div key={r.message_id} className="bg-secondary/40 rounded-lg p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{r.recipient_email || '—'}</p>
                      {biz && <p className="text-muted-foreground truncate">Business: {biz}</p>}
                      <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                      {r.error_message && (
                        <p className="text-[10px] text-destructive mt-1 break-words">{r.error_message}</p>
                      )}
                    </div>
                    {badge(r.status)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}