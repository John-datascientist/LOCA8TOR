import { ButtonLink, Card, Eyebrow } from "@/components/ui";

export const metadata = { title: "About" };

const stats = [
  { value: "2,400+", label: "Items given away" },
  { value: "38", label: "Postcodes covered in Lagos" },
  { value: "₦1.2M+", label: "In delivery fees sponsored" },
  { value: "2026", label: "Founded" },
];

export default function AboutPage() {
  return (
    <div className="container-page flex flex-col gap-14 py-14 sm:py-20">
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>About WeGive</Eyebrow>
        <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          A social distribution network, not just a free-stuff site
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Every day, useful things get thrown out simply because
          they&apos;re in the wrong place: a sofa a family has outgrown,
          surplus stock a business can&apos;t sell, food nearing its
          best-before date. WeGive exists to move those things to people who
          need them, and to make the hardest part, getting the item from A
          to B, someone else&apos;s problem to solve, not the giver&apos;s
          or the recipient&apos;s.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px border border-border-strong bg-border-strong sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-surface p-6">
            <span className="text-3xl font-black text-foreground">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
          Why it&apos;s not just a listings site
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Card>
            <h3 className="text-sm font-semibold text-foreground">Delivery is built in</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Most giveaway sites stop at &ldquo;here&apos;s my address, come
              get it.&rdquo; That leaves out anyone without a car, without
              help carrying a sofa, or without money for delivery. WeGive
              prices, arranges and tracks the delivery itself.
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-foreground">Nobody has to pay upfront</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A giver can commit to covering delivery when they list an
              item, and anyone can sponsor part of a stranger&apos;s delivery
              fee. Every payment sits in escrow until the delivery is
              actually confirmed.
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-foreground">Privacy by default</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Public listings show an area and distance, never an address.
              Exact pickup and delivery locations are only revealed once a
              claim is confirmed and both sides are committed.
            </p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
          How WeGive and Loca8tor split the work
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          WeGive and Loca8tor are sibling products under Workerholics
          Solutions, each responsible for a different half of the problem.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-foreground">WeGive owns</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>Users, giveaways, claims and reservations</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>Sponsorships, the escrow wallet and transactions</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>Campaigns, reports and WeGive-specific moderation</span>
              </li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-foreground">Loca8tor provides</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>Postcodes and location resolution</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>Distance, routing and navigation</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>Live tracking and rider/fleet infrastructure</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <Card className="flex flex-col items-start gap-4 bg-brand-light/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink">See it in action</h3>
          <p className="mt-1 text-sm text-ink/80">
            Four steps take an item from someone who no longer needs it to
            someone who does.
          </p>
        </div>
        <ButtonLink href="/how-it-works" variant="primary" className="w-full sm:w-auto">
          See how it works
        </ButtonLink>
      </Card>
    </div>
  );
}
