import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Banknote, AlertTriangle, PenLine, X, Check } from 'lucide-react';

const FAILURE_REASONS = [
  'Customer not available',
  'Wrong address',
  'Customer refused delivery',
  'Damaged package',
  'No access to building',
  'Customer asked to reschedule',
  'Other',
];

/** Compact action bar shown on each rider delivery card.
 *  Adds: COD collection toggle, failure reason picker, signature capture. */
export default function DeliveryActions({
  delivery,
  onChange,
}: {
  delivery: any;
  onChange: (patch: Record<string, any>) => void;
}) {
  const [showSig, setShowSig] = useState(false);
  const [showFail, setShowFail] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const collectCod = async () => {
    const { error } = await supabase
      .from('delivery_trackings')
      .update({ cod_collected: true, cod_collected_at: new Date().toISOString() })
      .eq('id', delivery.id);
    if (error) { toast.error('Could not mark cash collected'); return; }
    onChange({ cod_collected: true, cod_collected_at: new Date().toISOString() });
    toast.success(`₦${Number(delivery.cod_amount).toLocaleString()} marked as collected`);
  };

  const submitFailure = async () => {
    const reason = failReason === 'Other' ? otherReason.trim() : failReason;
    if (!reason) { toast.error('Pick a reason'); return; }
    const { error } = await supabase
      .from('delivery_trackings')
      .update({ status: 'failed', failure_reason: reason })
      .eq('id', delivery.id);
    if (error) { toast.error('Could not save'); return; }
    onChange({ status: 'failed', failure_reason: reason });
    setShowFail(false);
    toast.success('Marked failed with reason');
  };

  const saveSignature = async (dataUrl: string) => {
    const { error } = await supabase
      .from('delivery_trackings')
      .update({ signature_data: dataUrl, status: 'delivered' })
      .eq('id', delivery.id);
    if (error) { toast.error('Could not save signature'); return; }
    onChange({ signature_data: dataUrl, status: 'delivered' });
    setShowSig(false);
    toast.success('Signature captured — delivered!');
    // Award referrer (₦500) if this rider was referred and now fully qualifies.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      (supabase as any).rpc('check_rider_referral_qualification', {
        _referred_user_id: user.id,
      }).catch(() => {});
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
      {/* COD row */}
      {Number(delivery.cod_amount) > 0 && (
        <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${
          delivery.cod_collected ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-center gap-2 text-xs">
            <Banknote className="w-4 h-4 text-yellow-600" />
            <span className="font-bold">COD: ₦{Number(delivery.cod_amount).toLocaleString()}</span>
          </div>
          {delivery.cod_collected ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-700">
              <Check className="w-3 h-3" /> Collected
            </span>
          ) : (
            <button onClick={collectCod}
              className="px-2.5 py-1 rounded-md bg-yellow-500 text-yellow-50 text-[10px] font-bold">
              Mark Collected
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => setShowSig(true)}
          className="flex items-center justify-center gap-1 py-2 bg-background border border-border rounded-md text-[10px] font-bold text-muted-foreground hover:border-primary/40 hover:text-primary">
          <PenLine className="w-3.5 h-3.5" /> Capture Signature
        </button>
        <button onClick={() => setShowFail(true)}
          className="flex items-center justify-center gap-1 py-2 bg-background border border-border rounded-md text-[10px] font-bold text-muted-foreground hover:border-destructive/40 hover:text-destructive">
          <AlertTriangle className="w-3.5 h-3.5" /> Mark Failed
        </button>
      </div>

      {delivery.failure_reason && (
        <p className="text-[10px] text-destructive italic">Failed: {delivery.failure_reason}</p>
      )}
      {delivery.signature_data && (
        <div className="space-y-1">
          <p className="text-[10px] text-green-700 font-bold flex items-center gap-1">
            <Check className="w-3 h-3" /> Signed
          </p>
          <img src={delivery.signature_data} alt="Signature" className="h-16 bg-white rounded border border-border" />
        </div>
      )}

      {/* Failure modal */}
      {showFail && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
          <div className="bg-card rounded-xl ring-1 ring-border p-5 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold">Why did delivery fail?</h3>
              <button onClick={() => setShowFail(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {FAILURE_REASONS.map(r => (
                <button key={r} onClick={() => setFailReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                    failReason === r ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/30'
                  }`}>{r}</button>
              ))}
            </div>
            {failReason === 'Other' && (
              <textarea value={otherReason} onChange={e => setOtherReason(e.target.value)}
                placeholder="Describe the issue…" rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" />
            )}
            <button onClick={submitFailure}
              className="w-full py-2.5 bg-destructive text-destructive-foreground rounded-lg font-bold text-sm">
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Signature pad */}
      {showSig && <SignaturePad onCancel={() => setShowSig(false)} onSave={saveSignature} />}
    </div>
  );
}

function SignaturePad({ onCancel, onSave }: { onCancel: () => void; onSave: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, []);

  const pos = (e: any) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return { x: ((t.clientX - r.left) * c.width) / r.width, y: ((t.clientY - r.top) * c.height) / r.height };
  };

  const start = (e: any) => { drawing.current = true; const ctx = ref.current!.getContext('2d')!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e: any) => { if (!drawing.current) return; e.preventDefault(); const ctx = ref.current!.getContext('2d')!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasInk(true); };
  const end = () => { drawing.current = false; };
  const clear = () => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-4">
      <div className="bg-card rounded-xl ring-1 ring-border p-4 w-full max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold">Customer Signature</h3>
          <button onClick={onCancel}><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[11px] text-muted-foreground">Ask the customer to sign below to confirm delivery.</p>
        <canvas
          ref={ref}
          width={520}
          height={220}
          className="w-full border-2 border-dashed border-border rounded-lg bg-white touch-none"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={clear} className="py-2 bg-secondary border border-border rounded-lg text-xs font-bold">Clear</button>
          <button onClick={() => hasInk && onSave(ref.current!.toDataURL('image/png'))}
            disabled={!hasInk}
            className="py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50">
            Save & Mark Delivered
          </button>
        </div>
      </div>
    </div>
  );
}