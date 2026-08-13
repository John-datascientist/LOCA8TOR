import { useEffect, useRef, useState } from 'react';
import SEO from '@/components/SEO';
import { Link, useNavigate } from 'react-router-dom';
import { Crosshair, MapPin, Share2, Bike, Zap, Globe, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ScrollToTop from '@/components/ScrollToTop';
import PricingSection from '@/components/landing/PricingSection';
import { useUserAccess } from '@/hooks/useUserAccess';

function ReferCTA({ className, children }: { className?: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Check session at click time (avoids race conditions with onAuthStateChange)
    const { data } = await supabase.auth.getSession();
    if (data.session) navigate('/refer');
    else navigate('/login?redirect=/refer');
  };
  return (
    <a href="/login?redirect=/refer" onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

function CountUpStat({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const num = parseInt(value);
  const isNum = !isNaN(num);

  useEffect(() => {
    if (!isNum || !ref.current) return;
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * num);
      if (ref.current) ref.current.textContent = start.toLocaleString();
      if (progress < 1) requestAnimationFrame(animate);
    };
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { requestAnimationFrame(animate); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [num, isNum]);

  return (
    <div>
      <div ref={ref} className="font-heading text-3xl md:text-4xl font-black text-primary">
        {isNum ? '0' : value}
      </div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

const features = [
  { icon: <Crosshair className="w-5 h-5" />, title: 'Pinpoint Accuracy', desc: 'Find any spot, anywhere', color: 'bg-primary/10 text-primary' },
  { icon: <Zap className="w-5 h-5" />, title: 'Always Reliable', desc: 'Codes you can trust', color: 'bg-accent/10 text-accent' },
  { icon: <Bike className="w-5 h-5" />, title: 'Rider / Driver Tracking', desc: 'Live fleet & delivery tracking', color: 'bg-amber-500/10 text-amber-400' },
  { icon: <Share2 className="w-5 h-5" />, title: 'Share Anywhere', desc: 'WhatsApp, SMS, copy link', color: 'bg-teal-500/10 text-teal-400' },
  { icon: <Globe className="w-5 h-5" />, title: 'Global Coverage', desc: 'Works across countries', color: 'bg-blue-500/10 text-blue-400' },
  { icon: <MapPin className="w-5 h-5" />, title: 'Instant API', desc: 'REST API for businesses', color: 'bg-primary/10 text-primary' },
];

const steps = [
  { n: '01', emoji: '👆', title: 'Click Generate My Postcode', desc: 'Tap the button to start. We securely request your device location with one tap.', color: 'bg-primary/10' },
  { n: '02', emoji: '📍', title: 'Generate Your Current Postcode', desc: 'Your GPS is converted into a precise, shareable postcode for your exact spot.', color: 'bg-accent/10' },
  { n: '03', emoji: '📤', title: 'Share & Be Found', desc: 'Send your postcode via WhatsApp, SMS or link. Anyone can locate you instantly.', color: 'bg-teal-500/10' },
];

const countries = [
  { flag: '🇳🇬', name: 'Nigeria', sample: 'LA42 7BK', desc: '36 states & FCT, 774 LGAs mapped' },
  { flag: '🇬🇧', name: 'United Kingdom', sample: 'SW1A 1AA', desc: 'Real Royal Mail postcodes' },
  { flag: '🇺🇸', name: 'United States', sample: '10001', desc: 'Real USPS ZIP codes' },
  { flag: '🇨🇦', name: 'Canada', sample: 'M5V 3L9', desc: 'Real Canada Post codes' },
];

const isPreview = window.location.hostname.endsWith('.vercel.app') || window.location.hostname === 'localhost';

export default function LandingPage() {
  const { ready, showNgFeatures } = useUserAccess();
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setIsAuthed(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Only reveal Nigeria-gated sections once detection has completed.
  // Prevents a flash of NG-only content for non-NG users on slow networks.
  const showNg = ready && showNgFeatures;

  return (
    <>
      <SEO title="Loca8tor — Nigeria's Postcode Generator & Address System" description="Generate accurate postcodes in Nigeria instantly. Use Loca8tor to find, share and search precise location codes for delivery, navigation and logistics." path="/" />
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center px-5 md:px-7 overflow-hidden">
        <div className="grid-bg" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl pt-24 pb-16">

          <h1 className="font-heading text-[clamp(38px,7vw,88px)] font-black leading-[1.0] tracking-[-2.5px]">
            Your Location.<br />
            <em className="not-italic text-primary">Precisely</em><br />
            <span className="text-outline">Addressed.</span>
          </h1>

          <p className="text-muted-foreground text-[clamp(14px,1.8vw,18px)] leading-relaxed mt-6 max-w-xl">
            Stop describing where you are, make it easier to be found. Generate your current location Postcode.
          </p>

          <div className="flex flex-wrap gap-2 mt-8">
            {['🇳🇬 Nigeria', '🇬🇧 United Kingdom', '🇺🇸 United States', '🇨🇦 Canada'].map(c => (
              <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-full text-xs font-semibold text-muted-foreground">
                {c}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-9">
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-heading font-bold text-[15px] rounded-lg transition-all hover:brightness-110 hover:-translate-y-px glow-lime"
            >
              <Crosshair className="w-4 h-4" />
              Generate My Code
            </Link>
            {!ready ? (
              <div className="h-[52px] w-[260px] rounded-lg bg-secondary/40 animate-pulse" aria-hidden />
            ) : showNg && !isAuthed && (
              <>
                <button
                  onClick={() => navigate('/signup?type=business')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-secondary text-foreground font-heading font-semibold text-[15px] rounded-lg border border-border hover:border-primary/40 hover:text-primary transition-all cursor-pointer"
                >
                  Business Sign Up
                </button>
                <button
                  onClick={() => navigate('/signup?type=rider')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-muted-foreground font-heading font-semibold text-[15px] hover:text-primary transition-all cursor-pointer"
                >
                  Join as Rider / Driver
                </button>
              </>
            )}
          </div>

          {showNg && (
            <div className="flex flex-wrap gap-8 md:gap-12 mt-14 pt-9 border-t border-border">
              <CountUpStat value="36" label="States + FCT (NG)" />
              <CountUpStat value="774" label="LGAs Mapped" />
              <CountUpStat value="4" label="Countries" />
              <CountUpStat value="Street" label="Level Precision" />
            </div>
          )}
        </div>
      </section>

      {/* Features Row */}
      {showNg && (
      <section className="bg-card border-t border-border py-14 px-5 md:px-7">
        <div className="max-w-[1160px] mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {features.map(f => (
            <div key={f.title} className="flex gap-3 items-start">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${f.color}`}>
                {f.icon}
              </div>
              <div>
                <div className="text-sm font-bold">{f.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Refer & Earn CTA */}
      {!ready ? (
        <section className="border-t border-border py-14 px-5 md:px-7 bg-background">
          <div className="max-w-[1160px] mx-auto h-32 rounded-3xl bg-secondary/40 animate-pulse" aria-hidden />
        </section>
      ) : showNg && (
      <section className="border-t border-border py-14 px-5 md:px-7 bg-background">
        <div className="max-w-[1160px] mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-7 md:p-10">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-2">Refer & Earn</div>
                <h3 className="font-heading text-[clamp(22px,3.5vw,36px)] font-black leading-tight tracking-[-0.5px] text-foreground">
                  Share Loca8tor. Earn <span className="text-primary">₦100</span> per referral.
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  Sign in to lock in your referral link and balance, share it with friends, riders/drivers and logistics companies, and withdraw your earnings as airtime or data.
                </p>
              </div>
              <ReferCTA className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-heading font-bold text-sm rounded-lg transition-all hover:brightness-110 hover:-translate-y-px glow-lime whitespace-nowrap">
                <Gift className="w-4 h-4" /> Get My Code
              </ReferCTA>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* How It Works */}
      <section className="py-20 px-5 md:px-7">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-3">How It Works</div>
          <h2 className="font-heading text-[clamp(28px,4.5vw,54px)] font-extrabold leading-tight tracking-[-1.5px]">
            From GPS to Found.<br />In Three Steps.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden mt-12">
            {steps.map(s => (
              <div key={s.n} className="bg-secondary p-7 relative group hover:bg-surface-3 transition-colors">
                <div className="font-heading text-7xl font-black text-primary/[0.08] absolute top-3 right-4 leading-none">
                  {s.n}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${s.color}`}>
                  {s.emoji}
                </div>
                <h3 className="font-heading text-[17px] font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Countries */}
      <section className="py-20 px-5 md:px-7 bg-card border-t border-border">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-3">Coverage</div>
            <h2 className="font-heading text-[clamp(28px,4.5vw,44px)] font-extrabold tracking-[-1px]">
              Four Countries. One System.
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {countries.map(c => (
              <Link
                key={c.name}
                to="/generate"
                className="bg-secondary border border-border rounded-2xl p-7 text-center transition-all hover:border-primary/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group"
              >
                <div className="text-5xl mb-3">{c.flag}</div>
                <div className="font-heading text-lg font-bold">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
                <div className="font-mono text-[15px] text-primary tracking-[3px] mt-3 font-bold">{c.sample}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      {!ready ? (
        <section className="border-t border-border py-14 px-5 md:px-7">
          <div className="max-w-[1160px] mx-auto h-48 rounded-3xl bg-secondary/40 animate-pulse" aria-hidden />
        </section>
      ) : showNg && <PricingSection />}

      {/* CTA Band */}
      <section className="py-24 px-5 md:px-7 text-center relative overflow-hidden border-t border-border">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-4">Get Started</div>
          <h2 className="font-heading text-[clamp(28px,5vw,54px)] font-black tracking-[-1.5px]">
            Generate Your First Code.<br />
            <span className="text-primary">It's Free.</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mt-4 text-[15px]">
            One tap. One code. Shareable anywhere. Start with your current location.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-heading font-bold text-base rounded-lg transition-all hover:brightness-110 hover:-translate-y-px glow-lime"
            >
              <Crosshair className="w-5 h-5" />
              Generate My Code
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-5 md:px-7">
        <div className="max-w-[1160px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-heading text-lg font-black">
            LOCA<span className="text-primary">8</span>TOR
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Loca8tor is registered under Workerholics Solutions Ltd, United Kingdom.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <Link to="/track" className="hover:text-foreground">Track Delivery</Link>
            <Link to="/api" className="hover:text-foreground">Developers</Link>
            <Link to="/history" className="hover:text-foreground">History</Link>
            <Link to="/contact" className="hover:text-foreground">Contact Us</Link>
            <Link to="/legal" className="hover:text-foreground">Terms & Privacy</Link>
            <a
              href="https://www.instagram.com/loca8tor/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><path d="M18 6h.01"/></svg>
            </a>
            <a
              href="https://www.facebook.com/share/18G2Jr5ky7/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
    <ScrollToTop />
    </>
  );
}
