import { Link } from 'react-router-dom';
import { Check, Code, Zap, Shield, Globe, Rocket, ArrowRight, Database, BookOpen } from 'lucide-react';
import SEO from '@/components/SEO';

const tiers = [
  {
    name: 'Starter',
    price: '₦15,000',
    period: '/month',
    calls: '5,000 API calls',
    desc: 'For prototypes, side projects & small integrations.',
    icon: <Zap className="w-5 h-5" />,
    badge: null,
    overage: '₦4 per extra call',
    cta: 'Get Starter',
    highlight: false,
    features: [
      '5,000 API calls / month',
      'Postcode generation endpoint',
      'Reverse geocoding endpoint',
      'Address lookup endpoint',
      'Standard rate limit (60 req/min)',
      'Email support (48h response)',
      'Sandbox + production keys',
    ],
  },
  {
    name: 'Growth',
    price: '₦37,500',
    period: '/month',
    calls: '25,000 API calls',
    desc: 'For growing apps, logistics tools & SaaS products.',
    icon: <Rocket className="w-5 h-5" />,
    badge: 'POPULAR',
    overage: '₦2.50 per extra call',
    cta: 'Get Growth',
    highlight: true,
    features: [
      '25,000 API calls / month',
      'Everything in Starter',
      'Bulk batch endpoint (up to 500/req)',
      'Webhook events',
      'Higher rate limit (300 req/min)',
      'Priority email support (24h)',
      '99.9% uptime SLA',
    ],
  },
  {
    name: 'Scale',
    price: '₦100,000',
    period: '/month',
    calls: '100,000 API calls',
    desc: 'For high-volume platforms & enterprise apps.',
    icon: <Database className="w-5 h-5" />,
    badge: null,
    overage: '₦1.50 per extra call',
    cta: 'Get Scale',
    highlight: false,
    features: [
      '100,000 API calls / month',
      'Everything in Growth',
      'Dedicated rate limit (1,000 req/min)',
      'Multiple API keys & team access',
      'Usage analytics dashboard',
      'Slack / WhatsApp support channel',
      '99.95% uptime SLA',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    calls: 'Unlimited / negotiated',
    desc: 'For nationwide platforms, telcos & government.',
    icon: <Shield className="w-5 h-5" />,
    badge: null,
    overage: 'Volume pricing',
    cta: 'Contact Sales',
    highlight: false,
    features: [
      'Unlimited / custom volume',
      'Everything in Scale',
      'Dedicated infrastructure',
      'Custom endpoints & data exports',
      'On-prem / private deployment option',
      'Dedicated account manager',
      'Custom SLA & DPA',
    ],
  },
];

const FAQS = [
  { q: 'Is the API included in the Standard or Premium fleet plans?', a: 'No. The Loca8tor API is a completely separate product with its own pricing. Fleet plans (Standard ₦10,000 and Premium ₦30,000) cover the rider & business dashboard only — they do not include API access. API plans start at ₦15,000/mo for 5,000 calls.' },
  { q: 'What counts as an API call?', a: 'Any successful request to a Loca8tor API endpoint counts as one call. Failed requests (4xx/5xx) and cached responses do not count.' },
  { q: 'What happens if I exceed my plan limit?', a: 'You are billed per-call overage at the rate listed for your plan. We will email you at 80% and 100% of your monthly quota so there are no surprises.' },
  { q: 'Can I change plans?', a: 'Yes — upgrade or downgrade anytime. Changes take effect on your next billing cycle. Annual plans get 15% off.' },
  { q: 'Do you offer a free trial?', a: 'Yes. Every new API account gets 500 free sandbox calls to test integration before paying.' },
];

export default function ApiProduct() {
  return (
    <>
      <SEO
        title="Loca8tor for Developers — Postcode & Geocoding API"
        description="Loca8tor for Developers: precise postcode generation, reverse geocoding and address lookup for Nigeria, UK, US & Canada. Plans from ₦15,000/mo for 5,000 API calls."
        path="/api"
      />
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative py-20 px-5 text-center overflow-hidden border-b border-border">
          <div className="grid-bg" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[12px] font-bold text-primary uppercase tracking-wider mb-6">
              <Code className="w-3.5 h-3.5" /> For Developers · Sold Separately
            </div>
            <h1 className="font-heading text-[clamp(34px,5.5vw,60px)] font-black leading-[1.05] tracking-[-2px]">
              Loca8tor for <span className="text-primary">Developers</span>
            </h1>
            <p className="text-muted-foreground text-[15px] md:text-base mt-5 max-w-xl mx-auto leading-relaxed">
              Drop precise postcode generation, reverse geocoding and address lookup into your own apps.
              Built for Nigeria, plus UK, US and Canada. Priced per API call — completely separate from our fleet management plans.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-heading font-bold text-sm rounded-lg hover:brightness-110 glow-lime transition-all"
              >
                See API Pricing <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to="/api-docs"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-secondary text-foreground font-heading font-semibold text-sm rounded-lg border border-border hover:border-primary/30 transition-all"
              >
                <BookOpen className="w-4 h-4" /> Read the Docs
              </Link>
            </div>
          </div>
        </section>

        {/* Why */}
        <section className="py-16 px-5">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <Globe className="w-5 h-5" />, title: 'Coverage', desc: 'Full Nigeria 1km grid + UK / US / Canada via reverse geocoding.' },
              { icon: <Zap className="w-5 h-5" />, title: 'Fast', desc: 'Sub-200ms median response times from edge infrastructure.' },
              { icon: <Shield className="w-5 h-5" />, title: 'Reliable', desc: 'Up to 99.95% uptime SLA on Scale and Enterprise plans.' },
            ].map(b => (
              <div key={b.title} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">{b.icon}</div>
                <h3 className="font-heading font-bold text-base mb-1.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 px-5 border-t border-border">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-12">
              <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-3">API Pricing</div>
              <h2 className="font-heading text-[clamp(28px,4.5vw,44px)] font-extrabold tracking-[-1px]">
                Pay for the calls you use.
              </h2>
              <p className="text-muted-foreground mt-3 text-sm max-w-md mx-auto">
                Separate from fleet plans. Annual billing saves 15%.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {tiers.map(t => (
                <div
                  key={t.name}
                  className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                    t.highlight
                      ? 'border-primary/50 bg-primary/[0.03] shadow-lg shadow-primary/5 lg:-translate-y-2'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  {t.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full">
                      {t.badge}
                    </span>
                  )}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{t.icon}</div>
                    <h3 className="font-heading text-lg font-bold">{t.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="font-heading text-3xl font-black">{t.price}</span>
                    {t.period && <span className="text-muted-foreground text-sm">{t.period}</span>}
                  </div>
                  <p className="text-xs text-primary font-bold mb-2">{t.calls}</p>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{t.desc}</p>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {t.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-[11px] text-muted-foreground mb-3 italic">Overage: {t.overage}</p>

                  <Link
                    to={t.name === 'Enterprise' ? '/contact?topic=api-enterprise' : '/contact?topic=api-' + t.name.toLowerCase()}
                    className={`block text-center py-2.5 rounded-lg font-heading font-bold text-sm transition-all ${
                      t.highlight
                        ? 'bg-primary text-primary-foreground hover:brightness-110'
                        : 'bg-secondary text-foreground border border-border hover:border-primary/40'
                    }`}
                  >
                    {t.cta}
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-8">
              Looking for fleet management instead? See our <Link to="/pricing" className="text-primary font-semibold hover:underline">rider & business plans →</Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-5 border-t border-border">
          <div className="max-w-[700px] mx-auto">
            <h2 className="font-heading text-2xl font-bold text-center mb-10">API FAQ</h2>
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

        <footer className="border-t border-border py-6 text-center">
          <p className="text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} Loca8tor · Workerholics Solutions Ltd, United Kingdom
          </p>
        </footer>
      </div>
    </>
  );
}
