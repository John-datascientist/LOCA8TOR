import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, Heart, Send, Check } from 'lucide-react';
import { toast } from 'sonner';

/** Public rating + tip form shown on the customer tracking page once delivered. */
export default function RatingTipForm({
  tracking,
  branding,
  onSubmitted,
}: {
  tracking: any;
  branding: any | null;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [tip, setTip] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const showTip = branding?.show_tip_jar !== false;
  const showRating = branding?.show_rating !== false;

  const submit = async () => {
    if (rating < 1) { toast.error('Please pick a star rating'); return; }
    setBusy(true);
    const { error } = await supabase.from('delivery_ratings').insert({
      delivery_id: tracking.id,
      business_user_id: tracking.business_user_id,
      business_rider_id: tracking.business_rider_id,
      share_code: tracking.share_code,
      rating,
      comment: comment.trim() || null,
      tip_amount: tip,
      customer_name: tracking.customer_name,
    });
    if (tip > 0) {
      await supabase.from('delivery_trackings')
        .update({ tip_amount: tip })
        .eq('id', tracking.id);
    }
    setBusy(false);
    if (error) {
      // Unique constraint = already rated
      if (error.code === '23505') { toast.info('You already rated this delivery'); setDone(true); onSubmitted(); return; }
      toast.error('Could not submit rating'); return;
    }
    setDone(true);
    onSubmitted();
    toast.success('Thanks for the feedback!');
  };

  if (!showRating && !showTip) return null;
  if (done) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center space-y-1">
        <Check className="w-6 h-6 text-green-600 mx-auto" />
        <p className="text-sm font-bold text-green-700">Thank you!</p>
        <p className="text-[11px] text-muted-foreground">Your feedback was sent to {branding?.brand_name || 'the business'}.</p>
      </div>
    );
  }

  return (
    <div className="bg-secondary/40 rounded-xl p-4 space-y-3 ring-1 ring-border">
      {showRating && (
        <>
          <p className="text-sm font-heading font-bold text-center">How was your delivery?</p>
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n}
                onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="transition-transform hover:scale-110">
                <Star className={`w-7 h-7 ${(hover || rating) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value.slice(0, 280))}
            placeholder="Optional: tell them what went well…" rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs" />
        </>
      )}

      {showTip && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <p className="text-xs font-bold flex items-center justify-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-red-500" /> Add a tip for the rider
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 200, 500, 1000].map(amt => (
              <button key={amt} onClick={() => setTip(amt)}
                className={`py-2 rounded-lg text-xs font-bold border ${
                  tip === amt ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'
                }`}>
                {amt === 0 ? 'No tip' : `₦${amt}`}
              </button>
            ))}
          </div>
          <input type="number" min={0} max={50000} value={tip || ''}
            onChange={e => setTip(Math.max(0, Math.min(50000, Number(e.target.value) || 0)))}
            placeholder="Or custom amount"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs" />
          <p className="text-[10px] text-muted-foreground text-center">
            Tip recorded for the business to settle with the rider.
          </p>
        </div>
      )}

      <button onClick={submit} disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50">
        <Send className="w-4 h-4" /> {busy ? 'Sending…' : 'Submit'}
      </button>
    </div>
  );
}