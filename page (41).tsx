import Link from "next/link";
import { ButtonLink, Card, SectionHeading } from "@/components/ui";
import { HeroScene } from "@/components/hero-scene";
import { Marquee } from "@/components/marquee";
import { PeopleGroup } from "@/components/people-group";
import { FreeDeliveryBadge } from "@/components/free-delivery-badge";
import {
  nearbyGiveaways,
  openSponsorships,
} from "@/lib/mock-data";
import { countries, formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

const steps = [
  {
    number: "01",
    title: "Give",
    description:
      "List something you no longer need: furniture, electronics, food, clothing and more.",
  },
  {
    number: "02",
    title: "Claim",
    description:
      "People nearby who need it can claim it. Some giveaways need giver approval or verification.",
  },
  {
    number: "03",
    title: "Deliver",
    description:
      "WeGive calculates delivery cost using real distance and routing, then arranges a rider.",
  },
  {
    number: "04",
    title: "Track",
    description:
      "Follow the delivery live, from pickup to drop-off, until the item reaches its new home.",
  },
];

const categories = [
  { name: "Furniture", href: "/browse?category=Furniture" },
  { name: "Electronics", href: "/browse?category=Electronics" },
  { name: "Food", href: "/browse?category=Food" },
  { name: "Clothing", href: "/browse?category=Clothing" },
  { name: "Household", href: "/browse?category=Household" },
];

export default async function Home() {
  const country = await getSelectedCountry();
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="border-b border-border-strong bg-panel">
        <div className="mx-auto flex w-full max-w-[104rem] flex-col gap-10 overflow-hidden px-5 py-16 sm:px-10 sm:py-20 lg:py-24 xl:grid xl:grid-cols-[1fr_auto] xl:items-center xl:gap-8 2xl:gap-10">
          <div className="flex flex-col gap-6 sm:gap-8">
            <span className="label-caps text-xs font-semibold text-surface/70">
              Community giving network · 2026
            </span>
            <h1
              className="bubble-stack relative max-w-sm text-xl sm:max-w-md sm:text-2xl xl:max-w-lg xl:text-3xl"
              aria-label="Give what you can. Get what you need."
            >
              <span className="bubble-deco deco-gift text-3xl sm:text-4xl" aria-hidden="true">
                🎁
              </span>
              <span className="bubble-deco deco-heart text-2xl sm:text-3xl" aria-hidden="true">
                💚
              </span>
              <span className="bubble-deco deco-box text-2xl sm:text-3xl" aria-hidden="true">
                📦
              </span>
              <span className="bubble bubble-1 bg-bubble-blue px-4 py-2 sm:px-5 sm:py-2.5">
                Give
              </span>
              <span className="bubble bubble-2 bg-bubble-amber px-4 py-2 sm:px-5 sm:py-2.5">
                what you
              </span>
              <span className="bubble bubble-3 bg-bubble-purple px-4 py-2 sm:px-5 sm:py-2.5">
                can.
              </span>
              <span className="bubble bubble-4 bg-bubble-green px-4 py-2 sm:px-5 sm:py-2.5">
                Get what you need.
              </span>
            </h1>
            <p className="max-w-md text-lg font-medium leading-7 text-surface/85 sm:text-xl sm:leading-8">
              WeGive connects people and businesses giving away useful items
              with people who need them, making it easier to get those items
              delivered.
            </p>
            <div className="flex flex-col flex-wrap gap-3 pt-2 sm:flex-row sm:items-center">
              <Link
                href="/give"
                className="label-caps whitespace-nowrap border border-surface bg-surface px-5 py-4 text-center text-xs font-semibold text-ink transition-colors hover:bg-transparent hover:text-surface"
              >
                Give Something Away
              </Link>
              <Link
                href="/browse"
                className="label-caps whitespace-nowrap border border-btn-amber bg-btn-amber px-5 py-4 text-center text-xs font-semibold text-ink transition-opacity hover:opacity-85"
              >
                Find Something
              </Link>
              <Link
                href="/sponsor"
                className="label-caps whitespace-nowrap border border-btn-coral bg-btn-coral px-5 py-4 text-center text-xs font-semibold text-ink transition-opacity hover:opacity-85"
              >
                Sponsor a Delivery &nbsp;&#10230;
              </Link>
            </div>
          </div>
          <HeroScene className="justify-center xl:justify-end" />
        </div>
      </section>

      <Marquee />

      {/* How WeGive Works */}
      <section className="container-page py-20">
        <SectionHeading
          eyebrow="How it works"
          title="How WeGive Works"
          description="Four simple steps take an item from someone who no longer needs it to someone who does."
          action={{ href: "/how-it-works", label: "See more" }}
        />
        <div className="mt-10 grid grid-cols-1 divide-y divide-border border border-border-strong sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
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
            </div>
          ))}
        </div>
      </section>

      {/* Giveaways Near You */}
      <section className="border-y border-border-strong bg-surface-muted">
        <div className="container-page py-20">
          <SectionHeading
            eyebrow="Nearby"
            title="Giveaways Near You"
            description={
              country === "NG"
                ? "Based on your home postcode. Sign in and set your location to see items close to you."
                : `WeGive is still expanding to ${countries[country].name}. Be the first to list something.`
            }
            action={{ href: "/browse", label: "See more" }}
          />
          {country === "NG" ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {nearbyGiveaways.map((item) => (
                <Link key={item.id} href={`/giveaway/${item.id}`}>
                  <Card className="flex h-full flex-col gap-3 bg-surface transition-colors hover:border-ink">
                    <div className="flex h-28 items-center justify-center bg-brand-light text-4xl">
                      {item.emoji}
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="label-caps text-[11px] font-semibold text-muted-foreground">
                          {item.category}
                        </span>
                        {item.freeDelivery && <FreeDeliveryBadge />}
                      </div>
                      <h3 className="mt-1 text-base font-bold text-foreground">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.condition}
                    </p>
                    <p className="mt-auto border-t border-border pt-3 text-sm text-foreground/70">
                      {item.location} · ~{item.distanceKm} km away
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="mt-10 flex flex-col items-start gap-3 border-dashed bg-surface">
              <p className="text-sm font-semibold text-foreground">
                No listings in {countries[country].name} yet
              </p>
              <ButtonLink href="/giveaway/create" variant="primary">
                List a giveaway
              </ButtonLink>
            </Card>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="Explore" title="Browse by Category" />
        <div className="mt-8 border-t border-border-strong">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="group flex items-center justify-between border-b border-border-strong py-5 transition-colors hover:bg-surface-muted"
            >
              <span className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">
                {cat.name} /
              </span>
              <span className="text-xl text-foreground transition-transform group-hover:translate-x-1">
                &#10230;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Help Someone Get Their Giveaway */}
      <section className="border-y border-border-strong bg-surface-muted">
        <div className="container-page py-20">
          <SectionHeading
            eyebrow="Sponsorship"
            title="Help Someone Get Their Giveaway"
            description={
              country === "NG"
                ? "Some recipients need help covering the delivery fee. A small contribution gets the item moving."
                : `WeGive is still expanding to ${countries[country].name}. Check back soon for deliveries you can sponsor here.`
            }
            action={{ href: "/sponsor", label: "See more" }}
          />
          {country !== "NG" ? (
            <Card className="mt-10 flex flex-col items-start gap-3 border-dashed bg-surface">
              <p className="text-sm font-semibold text-foreground">
                No deliveries to sponsor in {countries[country].name} yet
              </p>
            </Card>
          ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {openSponsorships.map((s) => {
              const pct = Math.min(
                100,
                Math.round((s.fundedAmount / s.totalFee) * 100)
              );
              const fullyFunded = pct >= 100;
              return (
                <Card key={s.id} className="flex flex-col gap-4 bg-surface">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {s.itemTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Delivering to {s.recipientArea}
                    </p>
                  </div>
                  <div>
                    <div className="h-1.5 w-full overflow-hidden bg-border">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground">
                        {formatCurrency(s.fundedAmount, country)} of {formatCurrency(s.totalFee, country)}
                      </span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                  <ButtonLink
                    href={`/delivery/${s.id}`}
                    variant={fullyFunded ? "secondary" : "primary"}
                    className="mt-auto"
                  >
                    {fullyFunded ? "Fully funded" : "Sponsor this delivery"}
                  </ButtonLink>
                </Card>
              );
            })}
          </div>
          )}
        </div>
      </section>

      {/* Businesses Give Too */}
      <section className="border-b border-border-strong bg-panel">
        <div className="container-page flex flex-col gap-10 py-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="label-caps text-xs font-semibold text-surface/70">
              For businesses
            </span>
            <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight text-surface sm:text-5xl">
              Businesses Give Too
            </h2>
            <p className="mt-4 text-lg font-medium leading-7 text-surface/85">
              Companies can donate surplus stock, run giveaway campaigns for
              verified recipients, and sponsor deliveries at scale, with
              impact reporting on every campaign.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/business"
                className="label-caps border border-surface bg-surface px-7 py-4 text-center text-xs font-semibold text-ink transition-colors hover:bg-transparent hover:text-surface"
              >
                Explore corporate giving
              </Link>
              <Link
                href="/business/dashboard"
                className="label-caps px-2 py-3 text-xs font-semibold text-surface underline decoration-surface/40 decoration-1 underline-offset-4 hover:decoration-surface"
              >
                Business dashboard &nbsp;&#10230;
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-3 divide-x divide-surface/20 border border-surface/20">
            {[
              { label: "Surplus stock donated", value: "Bulk listings" },
              { label: "Verified recipients", value: "Eligibility rules" },
              { label: "Campaign impact", value: "Live reporting" },
            ].map((f) => (
              <div key={f.label} className="p-4 text-surface">
                <p className="text-sm font-semibold">{f.value}</p>
                <p className="mt-1 text-xs text-surface/60">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="border-b border-border-strong bg-surface-muted">
        <div className="container-page py-20">
          <SectionHeading
            eyebrow="Community"
            title="Thousands Giving Together"
            description="Every giveaway starts with a person deciding to share something. WeGive just makes it easy to find each other."
            align="center"
          />
          <PeopleGroup className="mt-14 text-ink" />
        </div>
      </section>

      {/* Delivery infrastructure */}
      <section className="container-page py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            {country === "NG" ? (
              <SectionHeading
                eyebrow="Infrastructure"
                title="Powered by Loca8tor"
                description="Every postcode, distance calculation, delivery route and live tracking update on WeGive runs on Loca8tor infrastructure, Workerholics' location and logistics platform."
              />
            ) : (
              <SectionHeading
                eyebrow="Infrastructure"
                title="Automatic Rider Matching"
                description="WeGive links every delivery to a nearby rider or driver automatically, based on distance and what's being delivered."
              />
            )}
            <ul className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                Postcode generation and resolution, without ever leaving WeGive
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                Accurate distance and routing between giver and recipient
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                {country === "NG"
                  ? "Verified riders, vehicles and fleets for delivery"
                  : "Automatic matching with a nearby rider or driver"}
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                Live tracking from pickup to drop-off
              </li>
            </ul>
          </div>
          <Card className="flex flex-col gap-4 bg-surface-muted">
            <p className="label-caps text-xs font-semibold text-foreground">
              Behind the scenes
            </p>
            <div className="flex flex-col gap-2 text-sm">
              {[
                "Giver location",
                country === "NG" ? "Loca8tor" : "Rider matching",
                "Route",
                "Distance",
                "Delivery price",
              ].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-ink text-xs font-semibold text-surface">
                    {i + 1}
                  </span>
                  <span className="text-foreground/80">{step}</span>
                  {i < arr.length - 1 && (
                    <span className="ml-auto text-muted-foreground">↓</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {country === "NG"
                ? "WeGive never trusts the browser for the final price. Loca8tor and the WeGive pricing engine calculate it server-side."
                : "WeGive never trusts the browser for the final price. It's always calculated server-side."}
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
