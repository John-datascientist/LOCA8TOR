import { Card, Eyebrow, ButtonLink } from "@/components/ui";
import { BackButton } from "@/components/back-button";
import { openSponsorships } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

export default async function DeliveryDetailPage({
  params,
}: PageProps<"/delivery/[id]">) {
  const { id } = await params;
  const country = await getSelectedCountry();
  const sponsorship = openSponsorships.find((s) => s.id === id);

  return (
    <div className="container-page flex flex-col items-center py-14 sm:py-20">
      <div className="mb-6 w-full max-w-lg">
        <BackButton />
      </div>
      <Card className="w-full max-w-lg">
        <Eyebrow>Delivery {id}</Eyebrow>
        <h1 className="mt-3 text-3xl font-black uppercase leading-[0.95] tracking-tight text-foreground">
          {sponsorship?.itemTitle ?? "Delivery details"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {sponsorship
            ? `Delivering to ${sponsorship.recipientArea}`
            : "Track this delivery from pickup to drop-off."}
        </p>

        {sponsorship && (
          <div className="mt-6 flex items-center justify-between border border-border bg-surface-muted p-4 text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(sponsorship.totalFee, country)}
            </span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`/delivery/${id}/track`} variant="primary" className="flex-1">
            Track this delivery
          </ButtonLink>
          {sponsorship && (
            <ButtonLink href="/sponsor" variant="secondary" className="flex-1">
              Sponsor this delivery
            </ButtonLink>
          )}
        </div>
      </Card>
    </div>
  );
}
