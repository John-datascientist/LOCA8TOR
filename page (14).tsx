import { ButtonLink, Card, Eyebrow } from "@/components/ui";
import { countries } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

export const metadata = { title: "Become a rider" };

const requirements = [
  "A valid ID and, for motorized deliveries, a driver's license",
  "A phone that can receive delivery notifications",
  "A bike, motorcycle, or vehicle suited to your area",
];

export default async function BecomeARiderPage() {
  const country = await getSelectedCountry();
  const isNigeria = country === "NG";
  const loca8torUrl = process.env.NEXT_PUBLIC_LOCA8TOR_RIDER_URL;

  return (
    <div className="container-page flex flex-col gap-14 py-14 sm:py-20">
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>Become a rider</Eyebrow>
        <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          Deliver for WeGive
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Riders pick up items from givers and deliver them to whoever
          claimed them, getting paid per delivery.
        </p>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-foreground">What you&apos;ll need</h3>
        <ul className="mt-3 flex flex-col gap-2">
          {requirements.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      {isNigeria ? (
        <div className="flex flex-col items-start gap-4 border border-border-strong bg-brand-light/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">Sign up with Loca8tor</h3>
            <p className="mt-1 text-sm leading-6 text-ink/80">
              WeGive deliveries in {countries[country].name} are carried out
              by riders verified through Loca8tor, our sibling logistics
              platform. Sign up there to start receiving delivery requests.
            </p>
          </div>
          {loca8torUrl ? (
            <a
              href={loca8torUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="label-caps w-full shrink-0 border border-ink bg-ink px-6 py-3.5 text-center text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink sm:w-auto"
            >
              Sign up on Loca8tor
            </a>
          ) : (
            <ButtonLink href="/contact" variant="primary" className="w-full shrink-0 sm:w-auto">
              Get in touch to sign up
            </ButtonLink>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 border border-border-strong bg-brand-light/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">Coming soon to {countries[country].name}</h3>
            <p className="mt-1 text-sm leading-6 text-ink/80">
              We&apos;re integrating an automatic rider-matching system for{" "}
              {countries[country].name}, so riders and drivers get linked to
              nearby deliveries without a separate app. Leave your details
              and we&apos;ll reach out when rider signups open.
            </p>
          </div>
          <ButtonLink href="/contact" variant="primary" className="w-full shrink-0 sm:w-auto">
            Get notified
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
