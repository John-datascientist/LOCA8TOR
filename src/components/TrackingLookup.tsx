import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function TrackingLookup() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { toast.error('Please enter a tracking code'); return; }

    setLoading(true);
    const { data, error } = await supabase
      .from('delivery_trackings')
      .select('share_code')
      .eq('share_code', trimmed)
      .maybeSingle();

    if (error || !data) {
      toast.error('Delivery not found. Please check your tracking code.');
      setLoading(false);
      return;
    }

    navigate(`/track/${data.share_code}`);
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <Package className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground">Track Your Delivery</h2>
        <p className="text-sm text-muted-foreground">Enter your tracking code to see live delivery status — no account needed</p>
      </div>

      <form onSubmit={handleTrack} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. TRK-M4X7KL-A3BF"
            className="w-full pl-10 pr-4 py-3.5 bg-secondary/60 border border-border rounded-xl text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-bold text-sm py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {loading ? 'Looking up...' : 'Track Delivery'}
        </button>
      </form>

      <div className="bg-card rounded-xl ring-1 ring-border p-4 space-y-3">
        <p className="text-xs font-heading font-bold text-foreground">How it works</p>
        <div className="space-y-2">
          {[
            { step: '1', text: 'Get your tracking code from the business or rider' },
            { step: '2', text: 'Enter the code above' },
            { step: '3', text: 'See real-time rider location, ETA, and delivery status' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
              <p className="text-xs text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
