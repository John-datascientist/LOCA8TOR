import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Zap, Target } from 'lucide-react';

/** Toggles auto-assign of new pending deliveries to the nearest available rider. */
export default function AutoAssignSettings({
  businessId,
  initialEnabled,
  initialRadius,
}: {
  businessId: string;
  initialEnabled: boolean;
  initialRadius: number;
}) {
  const [enabled, setEnabled] = useState(!!initialEnabled);
  const [radius, setRadius] = useState(initialRadius || 10);
  const [busy, setBusy] = useState(false);

  const save = async (e: boolean, r: number) => {
    setBusy(true);
    const { error } = await supabase.from('riders')
      .update({ auto_assign_enabled: e, auto_assign_radius_km: r })
      .eq('id', businessId);
    setBusy(false);
    if (error) { toast.error('Could not save'); return; }
    toast.success(e ? 'Auto-assign enabled' : 'Auto-assign disabled');
  };

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <p className="font-heading font-bold text-sm">Smart Auto-Assign</p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        New pending deliveries are automatically routed to the nearest available rider with a known live location.
      </p>
      <button onClick={() => { const v = !enabled; setEnabled(v); save(v, radius); }}
        disabled={busy}
        className={`w-full py-2.5 rounded-lg text-sm font-bold border ${
          enabled ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'
        }`}>
        {enabled ? '✓ Auto-assign ON' : 'Enable Auto-assign'}
      </button>
      {enabled && (
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Target className="w-3 h-3" /> Search radius: {radius} km
          </label>
          <input type="range" min={1} max={50} value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            onMouseUp={() => save(enabled, radius)}
            onTouchEnd={() => save(enabled, radius)}
            className="w-full mt-2" />
        </div>
      )}
    </div>
  );
}