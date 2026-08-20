import Link from "next/link";
import { ButtonLink, Card, Eyebrow } from "@/components/ui";
import { openSponsorships } from "@/lib/mock-data";
import { countries, formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

export const metadata = { title: "Sponsor a delivery" };

export default async function SponsorPage() {
  const country = await getSelectedCountry();
  const availableInCountry = country === "NG";

  return (
    <div className="container-page flex flex-col gap-8 py-14 sm:py-20">
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>Sponsor a delivery</Eyebrow>
        <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          Help someone get their giveaway
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          {availableInCountry
            ? "Some recipients need help covering the delivery fee. Sponsor all or part of a delivery: the amount you cover comes straight off what the recipient pays at checkout."
            : `WeGive is still expanding to ${countries[country].name}. Check back soon for deliveries you can sponsor here.`}
        </p>
      </div>

      {!availableInCountry ? (
        <Card className="flex flex-col items-start gap-3 border-dashed">
          <p className="text-sm font-semibold text-foreground">Nothing here yet</p>
          <p className="text-sm text-muted-foreground">
            There are no deliveries to sponsor in {countries[country].name} yet.
          </p>
          <ButtonLink href="/give" variant="primary">
            Give something away
          </ButtonLink>
        </Card>
      ) : (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {openSponsorships.map((s) => {
          const pct = Math.min(100, Math.round((s.fundedAmount / s.totalFee) * 100));
          const fullyFunded = pct >= 100;
          const remaining = s.totalFee - s.fundedAmount;
          return (
            <Card key={s.id} className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">{s.itemTitle}</h3>
                <p className="text-sm text-muted-foreground">Delivering to {s.recipientArea}</p>
              </div>
              <div>
                <div className="h-1.5 w-full overflow-hidden bg-surface-muted">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {formatCurrency(s.fundedAmount, country)} of {formatCurrency(s.totalFee, country)}
                  </span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
              </div>
              {!fullyFunded && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(remaining, country)} still needed
                </p>
              )}
              <Link
                href={fullyFunded ? `/delivery/${s.id}` : `/sponsor/${s.id}`}
                className={`label-caps mt-auto inline-flex items-center justify-center border px-5 py-3.5 text-xs font-semibold transition-colors ${
                  fullyFunded
                    ? "border-ink bg-surface text-ink"
                    : "border-ink bg-ink text-surface hover:bg-transparent hover:text-ink"
                }`}
              >
                {fullyFunded ? "Fully funded" : "Sponsor this delivery"}
              </Link>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
