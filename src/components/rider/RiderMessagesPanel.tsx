import { useEffect, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Rider inbox for messages sent by the linked business (BulkMessaging etc.),
 * plus a reply composer. Polls every 10s. Renders nothing when the rider
 * isn't linked to a business yet.
 */
export default function RiderMessagesPanel({
  businessRiderId,
  businessUserId,
}: {
  businessRiderId: string | null;
  businessUserId: string | null;
}) {
  const [messages, setMessages] = useState<
    { id: string; message: string; direction: string; created_at: string }[]
  >([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!businessRiderId) return;
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessRiderId]);

  const loadMessages = async () => {
    if (!businessRiderId) return;
    const { data } = await supabase
      .from('rider_messages')
      .select('*')
      .eq('business_rider_id', businessRiderId)
      .order('created_at', { ascending: false })
      .limit(30);
    setMessages((data || []) as any[]);
  };

  const sendReply = async () => {
    if (!newMsg.trim() || !businessRiderId || !businessUserId) return;
    setSending(true);
    const { error } = await supabase.from('rider_messages').insert({
      business_rider_id: businessRiderId,
      business_user_id: businessUserId,
      message: newMsg.trim(),
      direction: 'inbound',
    });
    if (error) toast.error(error.message);
    else {
      setNewMsg('');
      loadMessages();
    }
    setSending(false);
  };

  if (!businessRiderId) return null;

  return (
    <div className="bg-secondary border border-border rounded-xl p-4 space-y-3">
      <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" /> Company Messages
      </p>

      <div className="flex gap-1.5">
        <input
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Reply to your company..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendReply();
          }}
        />
        <button
          onClick={sendReply}
          disabled={sending || !newMsg.trim()}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-lg disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {messages.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No messages yet</p>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-xs ${
                m.direction === 'outbound' ? 'bg-secondary ml-6' : 'bg-primary/10 mr-6'
              }`}
            >
              <p className="text-foreground">{m.message}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {m.direction === 'inbound' ? 'You' : 'Company'} ·{' '}
                {new Date(m.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}