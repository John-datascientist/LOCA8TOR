import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Standard',
    price: '₦10,000',
    period: '/month',
    desc: 'For small logistics & delivery teams',
    badge: 'POPULAR',
    trial: '7-day free trial',
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Up to 10 riders', included: true },
      { text: 'Fleet management', included: true },
      { text: 'Bulk messaging', included: true },
      { text: 'Shift scheduling', included: true },
      { text: 'Live delivery tracking', included: false },
      { text: 'Photo proof of delivery', included: false },
      { text: 'Live rider map', included: false },
      { text: 'Route optimization', included: false },
      { text: 'Analytics & reports', included: false },
      { text: 'Invoice generator', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Start Free Trial / Pay',
    ctaLink: '/billing',
    highlight: true,
  },
  {
    name: 'Premium',
    price: '₦30,000',
    period: '/month',
    desc: 'For growing businesses & enterprises',
    trial: '7-day free trial',
    features: [
      { text: 'Everything in Standard', included: true },
      { text: 'Up to 40 riders', included: true },
      { text: 'Live delivery tracking', included: true },
      { text: 'Photo proof of delivery', included: true },
      { text: 'Live rider map dashboard', included: true },
      { text: 'Analytics & performance reports', included: true },
      { text: 'Route optimization', included: true },
      { text: 'Delivery zones & auto-assign', included: true },
      { text: 'Invoice generator', included: true },
      { text: 'Customer feedback & ratings', included: true },
      { text: 'Bulk CSV import', included: true },
      { text: 'Multi-branch support', included: true },
      { text: 'Custom branding on tracking', included: true },
      { text: 'Scheduled deliveries', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Start Free Trial / Pay',
    ctaLink: '/billing',
    highlight: false,
  },
];

export default function PricingSection() {
  return (
    <section className="py-20 px-5 md:px-7">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary mb-3">Pricing</div>
          <h2 className="font-heading text-[clamp(28px,4.5vw,44px)] font-extrabold tracking-[-1px]">
            Simple, Transparent Pricing.
          </h2>
          <p className="text-muted-foreground mt-3 text-sm max-w-md mx-auto">
            Start free. Upgrade when your business grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[800px] mx-auto">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all ${
                plan.highlight
                  ? 'border-primary/40 bg-primary/[0.03] shadow-lg shadow-primary/5 md:-translate-y-2'
                  : 'border-border bg-secondary'
              }`}
            >
              {plan.badge && (
                <span className="absolute top-4 right-4 px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/20">
                  {plan.badge}
                </span>
              )}
              <div className="font-heading text-lg font-bold">{plan.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-black">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{plan.desc}</p>
              {plan.trial && (
                <p className="text-xs text-primary font-bold mt-1">🎁 {plan.trial}</p>
              )}

              <ul className="mt-6 space-y-3">
                {plan.features.map(f => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={f.included ? '' : 'text-muted-foreground/50'}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.ctaLink}
                className={`mt-8 w-full py-3 rounded-lg font-heading font-bold text-sm transition-all block text-center ${
                  plan.highlight
                    ? 'bg-primary text-primary-foreground hover:brightness-110'
                    : 'bg-card border border-border hover:border-primary/30 text-foreground'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
