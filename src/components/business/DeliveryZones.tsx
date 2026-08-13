import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Plus, Trash2, Zap, Save } from 'lucide-react';

/** Define geo-zones with base fee, per-km fee, and surge multiplier. */
export default function DeliveryZones({ businessId }: { businessId: string }) {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<any | null>(null);

  const load = async () => {
    const { data } = await supabase.from('delivery_zones')
      .select('*').eq('business_user_id', businessId)
      .order('created_at', { ascending: false });
    setZones(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [businessId]);

  const useGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setDraft((d: any) => ({ ...d, center_lat: pos.coords.latitude, center_lng: pos.coords.longitude })),
      () => toast.error('Could not get location')
    );
  };

  const save = async () => {
    if (!draft.name || !draft.center_lat) { toast.error('Name + location required'); return; }
    const payload = { ...draft, business_user_id: businessId };
    const { error } = await supabase.from('delivery_zones')
      .upsert(payload, { onConflict: 'id' });
    if (error) { toast.error('Could not save zone'); return; }
    toast.success('Zone saved');
    setDraft(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this zone?')) return;
    await supabase.from('delivery_zones').delete().eq('id', id);
    load();
  };

  const toggleActive = async (z: any) => {
    await supabase.from('delivery_zones').update({ is_active: !z.is_active }).eq('id', z.id);
    load();
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-heading font-bold text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Delivery Zones & Pricing
        </p>
        {!draft && (
          <button onClick={() => setDraft({ name: '', center_lat: 0, center_lng: 0, radius_km: 5, base_fee: 500, per_km_fee: 100, surge_multiplier: 1, is_active: true })}
            className="text-[10px] text-primary font-bold flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Zone
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Charge differently per area. Surge multiplier × (base fee + per-km × distance).
      </p>

      {draft && (
        <div className="bg-secondary/40 rounded-lg p-3 space-y-2 ring-1 ring-primary/30">
          <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
            placeholder="Zone name (e.g. Lekki Phase 1)"
            className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="any" value={draft.center_lat || ''}
              onChange={e => setDraft({ ...draft, center_lat: Number(e.target.value) })}
              placeholder="Center lat" className="px-2 py-1.5 bg-background border border-border rounded text-xs font-mono" />
            <input type="number" step="any" value={draft.center_lng || ''}
              onChange={e => setDraft({ ...draft, center_lng: Number(e.target.value) })}
              placeholder="Center lng" className="px-2 py-1.5 bg-background border border-border rounded text-xs font-mono" />
          </div>
          <button onClick={useGps} className="text-[10px] text-primary font-bold underline">📍 Use my current location</button>
          <div className="grid grid-cols-3 gap-2">
            <NumF label="Radius (km)" v={draft.radius_km} on={(v) => setDraft({ ...draft, radius_km: v })} />
            <NumF label="Base fee ₦" v={draft.base_fee} on={(v) => setDraft({ ...draft, base_fee: v })} />
            <NumF label="Per km ₦" v={draft.per_km_fee} on={(v) => setDraft({ ...draft, per_km_fee: v })} />
          </div>
          <NumF label="Surge multiplier" v={draft.surge_multiplier} on={(v) => setDraft({ ...draft, surge_multiplier: v })} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDraft(null)} className="py-2 bg-secondary border border-border rounded text-xs font-bold">Cancel</button>
            <button onClick={save} className="py-2 bg-primary text-primary-foreground rounded text-xs font-bold flex items-center justify-center gap-1">
              <Save className="w-3 h-3" /> Save Zone
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-3">Loading…</p>
      ) : zones.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No zones yet.</p>
      ) : (
        <div className="space-y-1.5">
          {zones.map(z => {
            const sample5 = z.surge_multiplier * (Number(z.base_fee) + Number(z.per_km_fee) * 5);
            return (
              <div key={z.id} className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${z.is_active ? 'border-border bg-secondary/30' : 'border-border bg-muted/30 opacity-60'}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{z.name} {z.surge_multiplier > 1 && <span className="text-[10px] text-orange-500"><Zap className="w-3 h-3 inline" /> {z.surge_multiplier}x</span>}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {z.radius_km}km • Base ₦{Number(z.base_fee).toLocaleString()} + ₦{Number(z.per_km_fee).toLocaleString()}/km
                    <span className="text-primary"> → 5km = ₦{Math.round(sample5).toLocaleString()}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(z)} className="px-2 py-1 text-[10px] font-bold rounded bg-background border border-border">
                    {z.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => remove(z.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NumF({ label, v, on }: { label: string; v: number; on: (n: number) => void }) {
  return (
    <div>
      <label className="text-[9px] text-muted-foreground uppercase font-bold">{label}</label>
      <input type="number" step="any" value={v ?? ''} onChange={e => on(Number(e.target.value))}
        className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs" />
    </div>
  );
}