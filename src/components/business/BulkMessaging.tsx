import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, Users, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Rider {
  id: string;
  rider_name: string;
  rider_phone: string;
  status: string;
}

export default function BulkMessaging({ riders, businessId }: { riders: Rider[]; businessId: string }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [history, setHistory] = useState<{ msg: string; count: number; time: string }[]>([]);

  const filteredRiders = riders.filter(r =>
    filter === 'all' ? true : filter === 'active' ? r.status === 'active' : r.status !== 'active'
  );

  const sendBulk = async () => {
    if (!message.trim() || filteredRiders.length === 0) return;
    setSending(true);

    const inserts = filteredRiders.map(r => ({
      business_rider_id: r.id,
      business_user_id: businessId,
      message: message.trim(),
      direction: 'outbound',
    }));

    const { error } = await supabase.from('rider_messages').insert(inserts);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Message sent to ${filteredRiders.length} rider${filteredRiders.length > 1 ? 's' : ''}`);
      setHistory(prev => [{ msg: message.trim(), count: filteredRiders.length, time: new Date().toLocaleString() }, ...prev.slice(0, 9)]);
      setMessage('');
    }
    setSending(false);
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-4">
      <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" /> Broadcast Message
      </p>
      <p className="text-xs text-muted-foreground">Send a message to multiple riders at once.</p>

      {/* Filter */}
      <div className="flex gap-1.5">
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            {f === 'all' ? `All (${riders.length})` : f === 'active' ? `Active (${riders.filter(r => r.status === 'active').length})` : `Inactive (${riders.filter(r => r.status !== 'active').length})`}
          </button>
        ))}
      </div>

      {/* Recipients preview */}
      {filteredRiders.length > 0 && (
        <div className="bg-secondary/40 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Sending to {filteredRiders.length} rider{filteredRiders.length > 1 ? 's' : ''}:</p>
          <div className="flex flex-wrap gap-1">
            {filteredRiders.slice(0, 8).map(r => (
              <span key={r.id} className="text-[10px] bg-background px-1.5 py-0.5 rounded text-foreground">{r.rider_name}</span>
            ))}
            {filteredRiders.length > 8 && <span className="text-[10px] text-muted-foreground">+{filteredRiders.length - 8} more</span>}
          </div>
        </div>
      )}

      {/* Message input */}
      <textarea value={message} onChange={e => setMessage(e.target.value)}
        placeholder="Type your broadcast message..."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
        maxLength={500}
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
        <button onClick={sendBulk} disabled={sending || !message.trim() || filteredRiders.length === 0}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send to {filteredRiders.length} Riders
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Recent Broadcasts</p>
          {history.map((h, i) => (
            <div key={i} className="bg-secondary/40 rounded-lg px-3 py-2">
              <p className="text-xs text-foreground truncate">{h.msg}</p>
              <p className="text-[9px] text-muted-foreground">Sent to {h.count} riders · {h.time}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
