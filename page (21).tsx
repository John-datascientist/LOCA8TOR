import { ButtonLink, Card, Eyebrow } from "@/components/ui";

export const metadata = { title: "Business giving" };

const capabilities = [
  {
    title: "Bulk & surplus listings",
    body: "List multiple items at once instead of creating listings one by one, ideal for end-of-line stock, returns, or seasonal surplus.",
  },
  {
    title: "Eligibility requirements",
    body: "Target verified families, students, or a specific food-assistance campaign. Sensitive recipient information is never made publicly visible.",
  },
  {
    title: "Corporate giving balance",
    body: "Fund a balance your team draws from to sponsor deliveries at scale, instead of approving payment one delivery at a time.",
  },
  {
    title: "Impact reporting",
    body: "Track what's been given, claimed and delivered in real time, useful for CSR reporting and internal visibility alike.",
  },
];

const onboarding = [
  "Business name, registration details & address",
  "A representative contact who manages the account",
  "Verification documents where required for your category",
];

export default function BusinessPage() {
  return (
    <div className="container-page flex flex-col gap-14 py-14 sm:py-20">
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>For businesses</Eyebrow>
        <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          Businesses give too
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Donate surplus stock, run eligibility-based giveaway campaigns, and
          sponsor deliveries at scale, with a verified business profile and
          impact reporting built in.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {capabilities.map((c) => (
          <Card key={c.title}>
            <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.body}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Verified business onboarding</h3>
        <p className="text-sm text-muted-foreground">
          Every business account is verified before it can list bulk
          giveaways or fund sponsorships, so recipients and the platform can
          trust what&apos;s on offer.
        </p>
        <ul className="flex flex-col gap-2">
          {onboarding.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col items-start gap-4 border border-border-strong bg-brand-light/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink">Already verified?</h3>
          <p className="mt-1 text-sm text-ink/80">
            Head to your business dashboard to list stock or fund a campaign.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <ButtonLink href="/business/dashboard" variant="primary" className="w-full sm:w-auto">
            Go to business dashboard
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary" className="w-full sm:w-auto">
            Talk to the business team
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
