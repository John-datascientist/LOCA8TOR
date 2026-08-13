import { useState } from 'react';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Truck, MapPin, ArrowRight, Shield, Clock, Bike } from 'lucide-react';

export default function LiveMap() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a tracking code');
      return;
    }
    if (trimmed.length < 3) {
      setError('Tracking code is too short');
      return;
    }
    setError('');
    navigate(`/track/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Track Delivery — Loca8tor" description="Track your delivery in real-time with Loca8tor. Enter your tracking code to see live rider location and ETA." path="/map" />
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center px-5 overflow-hidden">
        <div className="grid-bg" />
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[12px] font-bold text-primary uppercase tracking-wider mb-6">
            <span className="pulse-dot" /> Real-time tracking
          </div>

          <h1 className="font-heading text-[clamp(32px,6vw,56px)] font-black leading-[1.05] tracking-[-2px]">
            Track Your<br />
            <span className="text-primary">Delivery</span>
          </h1>

          <p className="text-muted-foreground text-[15px] mt-4 max-w-md mx-auto">
            Enter your tracking code to see your rider's live location, ETA, and delivery status on a real-time map.
          </p>

          {/* Search form */}
          <form onSubmit={handleTrack} className="mt-8">
            <div className="flex gap-2 max-w-md mx-auto">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <input
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value); setError(''); }}
                  placeholder="Enter tracking code (e.g. TRK-A1B2C3)"
                  maxLength={30}
                  className="w-full h-13 pl-10 pr-4 bg-secondary border border-border rounded-xl text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-6 h-13 bg-primary text-primary-foreground font-heading font-bold text-sm rounded-xl hover:brightness-110 transition-all hover:-translate-y-px glow-lime flex items-center gap-2 shrink-0"
              >
                Track <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {error && (
              <p className="text-destructive text-xs mt-2 font-medium">{error}</p>
            )}
          </form>

          {/* Example codes */}
          <p className="text-[11px] text-muted-foreground mt-4">
            Your tracking code was shared via SMS, WhatsApp, or your delivery receipt
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card border-t border-border py-16 px-5">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-3">How It Works</div>
            <h2 className="font-heading text-[clamp(24px,4vw,36px)] font-extrabold tracking-[-1px]">
              Track Any Delivery in Seconds
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Package className="w-6 h-6" />,
                title: 'Get Your Code',
                desc: 'Your business sends you a unique tracking code when your delivery is dispatched.',
                color: 'bg-primary/10 text-primary',
              },
              {
                icon: <MapPin className="w-6 h-6" />,
                title: 'See Live Location',
                desc: 'Watch your rider move in real-time on an interactive map with ETA updates.',
                color: 'bg-blue-500/10 text-blue-400',
              },
              {
                icon: <Truck className="w-6 h-6" />,
                title: 'Track Progress',
                desc: 'Follow the delivery stages: Order Placed → Picked Up → In Transit → Delivered.',
                color: 'bg-emerald-500/10 text-emerald-400',
              },
            ].map(f => (
              <div key={f.title} className="bg-secondary border border-border rounded-2xl p-7 text-center transition-all hover:border-primary/20 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-heading text-[15px] font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-12 px-5 border-t border-border">
        <div className="max-w-[900px] mx-auto flex flex-wrap justify-center gap-6">
          {[
            { icon: <Shield className="w-4 h-4" />, text: 'No account needed' },
            { icon: <Clock className="w-4 h-4" />, text: 'Updates every 10 seconds' },
            { icon: <Bike className="w-4 h-4" />, text: 'Live rider GPS tracking' },
            { icon: <MapPin className="w-4 h-4" />, text: 'Powered by Loca8tor' },
          ].map(b => (
            <div key={b.text} className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="text-primary">{b.icon}</span>
              {b.text}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-[10px] text-muted-foreground">
          © {new Date().getFullYear()} Loca8tor · Workerholics Solutions Ltd, United Kingdom
        </p>
      </footer>
    </div>
  );
}
