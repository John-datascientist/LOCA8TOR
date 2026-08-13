import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, MessageSquare, Heart } from 'lucide-react';

export default function RatingsSummary({ businessId }: { businessId: string }) {
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('delivery_ratings')
        .select('*').eq('business_user_id', businessId)
        .order('created_at', { ascending: false }).limit(50);
      setRatings(data || []);
    })();
  }, [businessId]);

  const avg = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) : 0;
  const totalTips = ratings.reduce((s, r) => s + Number(r.tip_amount || 0), 0);

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <p className="font-heading font-bold text-sm flex items-center gap-2">
        <Star className="w-4 h-4 text-yellow-500" /> Customer Feedback
      </p>

      <div className="grid grid-cols-3 gap-2">
        <Card icon={<Star className="w-4 h-4 text-yellow-500" />} val={avg.toFixed(1)} sub={`${ratings.length} ratings`} />
        <Card icon={<Heart className="w-4 h-4 text-red-500" />} val={`₦${totalTips.toLocaleString()}`} sub="Total tips" />
        <Card icon={<MessageSquare className="w-4 h-4 text-primary" />} val={String(ratings.filter(r => r.comment).length)} sub="Comments" />
      </div>

      {ratings.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No ratings yet — they appear here once customers rate their deliveries.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {ratings.map(r => (
            <div key={r.id} className="bg-secondary/40 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`w-3 h-3 ${r.rating >= n ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs font-bold mt-1">{r.customer_name}</p>
              {r.comment && <p className="text-[11px] text-muted-foreground italic mt-0.5">“{r.comment}”</p>}
              {Number(r.tip_amount) > 0 && (
                <p className="text-[10px] text-red-500 font-bold mt-1">💰 Tipped ₦{Number(r.tip_amount).toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ icon, val, sub }: any) {
  return (
    <div className="bg-secondary/60 rounded-lg p-2.5 text-center">
      <div className="flex justify-center mb-0.5">{icon}</div>
      <p className="font-heading font-bold text-base">{val}</p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}