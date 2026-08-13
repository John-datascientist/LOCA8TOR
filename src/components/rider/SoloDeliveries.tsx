import { useEffect, useState } from 'react';
import { Loader2, Plus, Copy, MessageCircle, Smartphone, ExternalLink, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Tracking = {
  id: string;
  share_code: string;
  customer_name: string;
  customer_phone: string | null;
  from_postcode: string | null;
  to_postcode: string | null;
  status: string;
  delivery_fee: number | null;
  created_at: string | null;
};

const STATUSES = ['pending', 'accepted', 'picked_up', 'on_my_way_deliver', 'delivered', 'failed'];

export default function SoloDeliveries({
  riderId,
  riderName,
  riderPhone,
  lat,
  lng,
}: {
  riderId: string;
  riderName: string;
  riderPhone: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const [rows, setRows] = useState<Tracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer: '', phone: '', from: '', to: '', fee: '', notes: '' });

  const load = async () => {
    const { data } = await supabase
      .from('delivery_trackings')
      .select('id, share_code, customer_name, customer_phone, from_postcode, to_postcode, status, delivery_fee, created_at')
      .eq('business_user_id', riderId)
      .order('created_at', { ascending: false })
      .limit(30);
    setRows((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [riderId]);

  /** Solo riders act as their own one-person fleet so tracking rows have an owner. */
  const ensureSelfFleetRow = async (): Promise<string | null> => {
    const { data: existing } = await supabase
      .from('business_riders')
      .select('id')
      .eq('business_user_id', riderId)
      .eq('linked_rider_id', riderId)
      .maybeSingle();
    if ((existing as any)?.id) return (existing as any).id;
    const { data, error } = await supabase
      .from('business_riders')
      .insert({
        business_user_id: riderId,
        linked_rider_id: riderId,
        rider_name: riderName || 'Rider',
        rider_phone: riderPhone || '',
        status: 'active',
      } as any)
      .select('id')
      .maybeSingle();
    if (error) { toast.error(error.message); return null; }
    return (data as any)?.id ?? null;
  };

  const trackUrl = (code: string) => `${window.location.origin}/track/${code}`;
  const shareText = (t: Tracking) =>
    `Hi ${t.customer_name}, track your delivery from ${riderName}.\n\nTracking code: ${t.share_code}\n${trackUrl(t.share_code)}`;

  const shareWhatsApp = (t: Tracking) => {
    const digits = (t.customer_phone || '').replace(/[^0-9]/g, '');
    const to = digits ? (digits.startsWith('0') ? '234' + digits.slice(1) : digits) : '';
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(shareText(t))}`, '_blank');
  };
  const shareSms = (t: Tracking) => {
    window.location.href = `sms:${(t.customer_phone || '').replace(/[^0-9+]/g, '')}?&body=${encodeURIComponent(shareText(t))}`;
  };
  const copyLink = async (t: Tracking) => {
    try { await navigator.clipboard.writeText(trackUrl(t.share_code)); toast.success('Tracking link copied'); }
    catch { toast.error('Could not copy'); }
  };

  const createDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fleetId = await ensureSelfFleetRow();
    if (!fleetId) { setBusy(false); return; }
    const code = `TRK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { error } = await supabase.from('delivery_trackings').insert({
      business_user_id: riderId,
      business_rider_id: fleetId,
      share_code: code,
      customer_name: form.customer.trim(),
      customer_phone: form.phone.trim() || null,
      from_postcode: form.from.trim().toUpperCase() || null,
      to_postcode: form.to.trim().toUpperCase() || null,
      status: 'pending',
      rider_name: riderName,
      rider_phone: riderPhone,
      notes: form.notes.trim() || null,
      delivery_fee: form.fee ? Number(form.fee) : null,
      last_lat: lat ?? null,
      last_lng: lng ?? null,
      pickup_lat: lat ?? null,
      pickup_lng: lng ?? null,
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Tracking link created — ${code}`);
    setForm({ customer: '', phone: '', from: '', to: '', fee: '', notes: '' });
    setShowForm(false);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from('delivery_trackings').update({ status } as any).eq('id', id);
    if (error) { toast.error(error.message); load(); }
  };

  return (
    <div className="bg-secondary border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> My Deliveries & Tracking Links
        </p>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 text-xs text-primary font-bold hover:underline">
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {showForm && (
        <form onSubmit={createDelivery} className="bg-background rounded-lg p-3 space-y-2 border border-border">
          <div className="grid grid-cols-2 gap-2">
            <input required value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })}
              placeholder="Customer name" className="rounded-md border border-input bg-secondary px-3 py-2 text-xs" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="Customer phone" className="rounded-md border border-input bg-secondary px-3 py-2 text-xs" />
            <input value={form.from} onChange={e => setForm({ ...form, from: e.target.value.toUpperCase() })}
              placeholder="Pickup postcode" className="rounded-md border border-input bg-secondary px-3 py-2 text-xs font-mono" />
            <input value={form.to} onChange={e => setForm({ ...form, to: e.target.value.toUpperCase() })}
              placeholder="Drop-off postcode" className="rounded-md border border-input bg-secondary px-3 py-2 text-xs font-mono" />
            <input type="number" min={0} value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })}
              placeholder="Fee (₦)" className="rounded-md border border-input bg-secondary px-3 py-2 text-xs" />
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes" className="rounded-md border border-input bg-secondary px-3 py-2 text-xs" />
          </div>
          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-bold py-2 rounded-lg disabled:opacity-60">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create tracking link
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No deliveries yet. Create one to get a shareable tracking link for your customer.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(t => (
            <div key={t.id} className="bg-background border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-primary font-bold">{t.share_code}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t.status}</span>
              </div>
              <p className="text-xs font-bold text-foreground">{t.customer_name}{t.customer_phone ? ` · ${t.customer_phone}` : ''}</p>
              <p className="text-[11px] text-muted-foreground">
                {t.from_postcode || '—'} → {t.to_postcode || '—'}{t.delivery_fee ? ` · ₦${Number(t.delivery_fee).toLocaleString()}` : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => setStatus(t.id, s)} disabled={t.status === s}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold ${t.status === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                <button onClick={() => copyLink(t)} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/70">
                  <Copy className="w-3 h-3" /> Copy link
                </button>
                <button onClick={() => shareWhatsApp(t)} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/25">
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </button>
                <button onClick={() => shareSms(t)} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/70">
                  <Smartphone className="w-3 h-3" /> Text
                </button>
                <a href={`/track/${t.share_code}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/70">
                  <ExternalLink className="w-3 h-3" /> Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
