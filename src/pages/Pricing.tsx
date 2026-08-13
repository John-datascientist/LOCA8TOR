import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Zap, Crown, Rocket } from 'lucide-react';
import SEO from '@/components/SEO';

const FAQS = [
  { q: 'Are the free tools really free?', a: 'Yes! Postcode generation, search, sharing, and the quiz are free for everyone — no registration required. Paid plans are for businesses managing rider fleets.' },
  { q: 'Can I change plans later?', a: 'Absolutely. Upgrade or downgrade anytime from Billing. Changes take effect immediately.' },
  { q: 'What payment methods do you accept?', a: 'We accept bank transfer, debit/credit cards, and Paga. All major Nigerian banks, cards, and mobile money are supported, plus international cards.' },
  { q: 'Do riders or drivers need to pay?', a: 'No — Loca8tor is completely free for riders / drivers. Riders and drivers can sign up, search postcodes, accept deliveries, play the quiz and withdraw earnings without ever paying a subscription. Only businesses managing a fleet pay.' },
];

const tiers = [
  {
    name: 'Standard',
    price: '₦10,000',
    period: '/month',
    desc: 'For small logistics & delivery teams.',
    icon: <Crown className="w-5 h-5" />,
    color: 'border-primary',
    badge: 'Most Popular',
    trial: '7-day free trial',
    cta: 'Start Free Trial / Pay',
    ctaLink: '/billing',
    ctaStyle: 'bg-primary text-primary-foreground hover:brightness-110 glow-lime',
    features: {
      'Postcode generation': true,
      'Search & lookup': true,
      'Share via WhatsApp/SMS': true,
      'Quiz & earn rewards': true,
      'Riders / Drivers': 'Up to 10',
      'Fleet management': true,
      'Bulk messaging': true,
      'Shift scheduling': true,
      'Delivery tracking': false,
      'Photo proof of delivery': false,
      'Live rider map': false,
      'Route optimization': false,
      'Delivery zones & auto-assign': false,
      'Analytics & reports': false,
      'Invoice generator': false,
      'Customer feedback & ratings': false,
      'Bulk CSV import': false,
      'Multi-branch support': false,
      'Custom branding': false,
      'Scheduled deliveries': false,
      'Priority support': false,
    },
  },
  {
    name: 'Premium',
    price: '₦30,000',
    period: '/month',
    desc: 'For growing businesses & enterprises.',
    icon: <Rocket className="w-5 h-5" />,
    color: 'border-border',
    badge: null,
    trial: '7-day free trial',
    cta: 'Start Free Trial / Pay',
    ctaLink: '/billing',
    ctaStyle: 'bg-secondary text-foreground border border-border hover:border-primary/40',
    features: {
      'Postcode generation': true,
      'Search & lookup': true,
      'Share via WhatsApp/SMS': true,
      'Quiz & earn rewards': true,
      'Riders / Drivers': 'Up to 40',
      'Delivery tracking': true,
      'Fleet management': true,
      'Bulk messaging': true,
      'Shift scheduling': true,
      'Photo proof of delivery': true,
      'Live rider map': true,
      'Route optimization': true,
      'Delivery zones & auto-assign': true,
      'Analytics & reports': true,
      'Invoice generator': true,
      'Customer feedback & ratings': true,
      'Bulk CSV import': true,
      'Multi-branch support': true,
      'Custom branding': true,
      'Scheduled deliveries': true,
      'Priority support': true,
    },
  },
];

const featureKeys = Object.keys(tiers[0].features);

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
    <SEO
      title="Pricing — Loca8tor Plans for Riders / Drivers & Businesses"
      description="Compare Loca8tor pricing plans for individuals, riders, and delivery businesses. Free postcode generation plus paid tiers with fleet tools and live tracking."
      path="/pricing"
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }}
    />
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-5 text-center overflow-hidden border-b border-border">
        <div className="grid-bg" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[12px] font-bold text-primary uppercase tracking-wider mb-6">
            🎉 FREE BETA — All features unlocked
          </div>
          <h1 className="font-heading text-[clamp(32px,5vw,56px)] font-black leading-[1.05] tracking-[-2px]">
            Simple, Transparent<br /><span className="text-primary">Pricing</span>
          </h1>
          <p className="text-muted-foreground text-[15px] mt-4 max-w-lg mx-auto">
            Start free. Upgrade as you grow.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-xs text-muted-foreground">
            <span>Looking for the developer API?</span>
            <Link to="/api" className="text-primary font-bold hover:underline">See API pricing →</Link>
          </div>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-semibold ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-primary' : 'bg-secondary border border-border'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${annual ? 'left-[26px] bg-primary-foreground' : 'left-0.5 bg-muted-foreground'}`} />
            </button>
            <span className={`text-sm font-semibold ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual <span className="text-primary text-xs font-bold">Save 15%</span>
            </span>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="py-16 px-5">
        <div className="max-w-[800px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {tiers.map(t => {
            const priceNum = parseInt(t.price.replace(/[₦,]/g, ''));
            const monthlyPrice = annual ? Math.round(priceNum * 0.85) : priceNum;
            const displayPrice = `₦${monthlyPrice.toLocaleString()}`;
            const annualTotal = annual ? `₦${(monthlyPrice * 12).toLocaleString()}/yr` : null;

            return (
              <div key={t.name} className={`relative bg-card rounded-2xl border-2 ${t.color} p-7 flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5`}>
                {t.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-full">
                    {t.badge}
                  </div>
                )}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {t.icon}
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold">{t.name}</h3>
                  </div>
                </div>
                <div className="mb-1">
                  <span className="font-heading text-3xl font-black">{displayPrice}</span>
                  <span className="text-muted-foreground text-sm">{t.period}</span>
                </div>
                {annual && annualTotal && (
                  <p className="text-[11px] text-muted-foreground mb-1">Billed as {annualTotal}</p>
                )}
                {t.trial && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-4">
                    <span className="text-[11px] font-bold text-primary">🎁 {t.trial}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">{t.desc}</p>

                <Link
                  to={t.ctaLink}
                  className={`block text-center py-3 rounded-lg font-heading font-bold text-sm transition-all ${t.ctaStyle}`}
                >
                  {t.cta}
                </Link>

                <div className="mt-6 pt-5 border-t border-border space-y-2.5 flex-1">
                  {featureKeys.map(fk => {
                    const val = t.features[fk as keyof typeof t.features];
                    return (
                      <div key={fk} className="flex items-center gap-2.5 text-xs">
                        {val === false ? (
                          <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <span className={val === false ? 'text-muted-foreground/50' : 'text-foreground'}>
                          {fk}
                          {typeof val === 'string' && <span className="text-primary font-semibold ml-1">({val})</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-5 border-t border-border">
        <div className="max-w-[700px] mx-auto">
          <h2 className="font-heading text-2xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQS.map(f => (
              <details key={f.q} className="bg-card border border-border rounded-xl group">
                <summary className="px-5 py-4 cursor-pointer font-heading font-semibold text-sm text-foreground list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-primary text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5 text-center border-t border-border relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10">
          <h2 className="font-heading text-[clamp(24px,4vw,40px)] font-black tracking-[-1px]">
            Start Delivering <span className="text-primary">Smarter</span> Today
          </h2>
          <p className="text-muted-foreground mt-3 text-sm max-w-md mx-auto">
            Join hundreds of Nigerian businesses using Loca8tor for precise deliveries.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <Link
              to="/billing"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-heading font-bold text-sm rounded-lg hover:brightness-110 glow-lime transition-all"
            >
              Open Billing →
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-secondary text-foreground font-heading font-semibold text-sm rounded-lg border border-border hover:border-primary/30 transition-all"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center">
        <p className="text-[10px] text-muted-foreground">
          © {new Date().getFullYear()} Loca8tor · Workerholics Solutions Ltd, United Kingdom
        </p>
      </footer>
    </div>
    </>
  );
}
