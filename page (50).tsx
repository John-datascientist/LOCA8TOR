import Link from "next/link";
import { ButtonLink, Card, Eyebrow } from "@/components/ui";

export const metadata = { title: "Safety" };

const sections = [
  {
    heading: "Location privacy",
    items: [
      "Public listings show an area and approximate distance only",
      "Exact pickup/delivery addresses are shared only after a delivery is confirmed",
      "Sponsors see the item, area and amount needed, never an address",
    ],
  },
  {
    heading: "Verification",
    items: [
      "Riders are verified: identity, phone, vehicle and required credentials",
      "Businesses go through a separate verification flow before listing",
      "Some giveaways require the recipient to be verified before claiming",
    ],
  },
  {
    heading: "Controlled messaging",
    items: [
      "Giver and recipient can only message after a claim exists",
      "Rider and recipient can only message during an active delivery",
      "Messages are scoped to that one exchange, not open direct messaging",
    ],
  },
  {
    heading: "Payments held in escrow",
    items: [
      "Delivery and sponsorship payments sit in WeGive's escrow wallet",
      "Funds are released to a rider only once delivery is confirmed",
      "No payment is ever made directly between users",
    ],
  },
];

const tips = [
  {
    title: "Meeting a rider",
    body: "Confirm the rider's name and vehicle shown in the app match who arrives. Riders never ask for payment in person; everything runs through escrow.",
  },
  {
    title: "Before you claim",
    body: "Read the item's condition notes and photos closely. Message the giver through the claim thread if anything's unclear before delivery is arranged.",
  },
  {
    title: "During delivery",
    body: "Live tracking shows exactly where your rider is. If a delivery seems off (wrong item, damaged goods, a rider who won't confirm their identity), pause and report it.",
  },
];

export default function SafetyPage() {
  return (
    <div className="container-page flex flex-col gap-14 py-14 sm:py-20">
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>Safety</Eyebrow>
        <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          Built with privacy and safety in mind
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          WeGive limits what&apos;s shared publicly, verifies the people who
          move items through the platform, and holds every payment in escrow
          until a delivery is actually confirmed.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.heading}>
            <h3 className="text-sm font-semibold text-foreground">{section.heading}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
          Staying safe, step by step
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {tips.map((tip) => (
            <Card key={tip.title}>
              <h3 className="text-sm font-semibold text-foreground">{tip.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{tip.body}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="flex flex-col items-start gap-4 border-border-strong bg-warn-light/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink">Something feel wrong?</h3>
          <p className="mt-1 max-w-xl text-sm text-ink/80">
            Report a listing, a message, or a delivery directly, or reach the
            trust &amp; safety team at{" "}
            <a href="mailto:safety@wegive.app" className="font-semibold underline decoration-1 underline-offset-4">
              safety@wegive.app
            </a>
            . Reports affecting an active delivery are reviewed first.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <ButtonLink href="/contact" variant="primary" className="w-full sm:w-auto">
            Report a safety concern
          </ButtonLink>
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        In an emergency, contact local emergency services first. WeGive
        support follows up afterward; it isn&apos;t a substitute. See our{" "}
        <Link href="/terms" className="font-semibold text-ink underline decoration-1 underline-offset-4">
          terms of service
        </Link>{" "}
        for how account suspension and disputes work.
      </p>
    </div>
  );
}
