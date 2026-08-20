import { ButtonLink, Eyebrow } from "@/components/ui";

export const metadata = { title: "How it works" };

const steps = [
  {
    number: "01",
    title: "Give",
    description:
      "List an item with a category-specific form: furniture, electronics, food and more each ask for what actually matters.",
    items: [
      "Add photos, condition and pickup requirements",
      "Choose whether you'll cover the delivery fee",
      "Listing goes through review before it's visible",
    ],
  },
  {
    number: "02",
    title: "Claim",
    description:
      "Nearby recipients browse by category and distance, then claim what they need.",
    items: [
      "Claiming reserves the item for 30 minutes",
      "The giver can approve a specific recipient",
      "Some giveaways require a verified recipient",
    ],
  },
  {
    number: "03",
    title: "Deliver",
    description:
      "WeGive prices the delivery and holds payment safely until it's actually completed.",
    items: [
      "Delivery fee, VAT and admin fee calculated server-side from distance",
      "Pay by card or bank transfer, or share a link so others can sponsor it",
      "Every payment sits in escrow until delivery is confirmed",
    ],
  },
  {
    number: "04",
    title: "Track",
    description:
      "A verified rider carries the item, with visibility the whole way.",
    items: [
      "Live tracking from pickup to drop-off, via Loca8tor",
      "Notifications at every stage of the delivery",
      "Exact addresses are only shared once a delivery is confirmed",
    ],
  },
];

const faqs = [
  {
    q: "What if no one claims my item?",
    a: "It stays listed as Available indefinitely. There's no expiry on the listing itself, only on an active claim's 30-minute reservation window.",
  },
  {
    q: "What if I can't afford the delivery fee?",
    a: "Share your delivery's sponsorship link so others can help cover it, in full or in part, or the giver may have already committed to covering it, in which case delivery shows as free.",
  },
  {
    q: "How is the delivery fee actually calculated?",
    a: "A base fee plus a per-kilometre rate, adjusted for vehicle type, then VAT and a small WeGive admin fee. It's computed server-side from the real distance between giver and recipient, never estimated by the browser.",
  },
  {
    q: "When does a rider actually get paid?",
    a: "Only after delivery is confirmed complete. Until then, whatever was paid (by the recipient, the giver, or sponsors) sits in WeGive's escrow wallet.",
  },
  {
    q: "Can a business give away items too?",
    a: "Yes. Verified businesses can list bulk or surplus stock, target eligibility requirements like verified families or students, and fund a corporate giving balance to sponsor deliveries at scale.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container-page flex flex-col gap-16 py-14 sm:py-20">
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>How it works</Eyebrow>
        <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          Give. Claim. Deliver. Track.
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Every giveaway on WeGive moves through the same clear lifecycle,
          whether it&apos;s a sofa, a laptop, or a bag of rice.
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border border-border-strong sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col gap-3 p-6">
            <span className="font-mono text-sm font-semibold text-muted-foreground">
              {step.number}
            </span>
            <h3 className="text-xl font-black uppercase tracking-tight text-foreground">
              {step.title}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {step.description}
            </p>
            <ul className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
              {step.items.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
          Common questions
        </h2>
        <div className="flex flex-col divide-y divide-border border-t border-border-strong">
          {faqs.map((f) => (
            <div key={f.q} className="flex flex-col gap-2 py-6 sm:flex-row sm:gap-8">
              <h3 className="text-sm font-bold text-foreground sm:w-72 sm:shrink-0">
                {f.q}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 border border-border-strong bg-brand-light/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink">Ready to give something away?</h3>
          <p className="mt-1 text-sm text-ink/80">
            List an item in minutes: the form adapts to what you&apos;re giving.
          </p>
        </div>
        <ButtonLink href="/give" variant="primary" className="w-full sm:w-auto">
          Start giving
        </ButtonLink>
      </div>
    </div>
  );
}
