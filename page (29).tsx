import { Card, Eyebrow } from "@/components/ui";
import { BackButton } from "@/components/back-button";
import { PaymentPanel } from "@/components/payment-panel";
import { ShareSponsorLink } from "@/components/share-sponsor-link";
import { AddressFields, type ProfileAddress } from "@/components/address-fields";
import { nearbyGiveaways } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";
import { createClient } from "@/lib/supabase/server";

const breakdown = {
  distanceKm: 8.7,
  deliveryFee: 3500,
  vat: 525,
  adminFee: 200,
  sponsorContribution: 2000,
};

export default async function GiveawayDeliveryPage({
  params,
}: PageProps<"/giveaway/[id]/delivery">) {
  const { id } = await params;
  const country = await getSelectedCountry();
  const item = nearbyGiveaways.find((g) => g.id === id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
  const profileAddress: ProfileAddress | null =
    meta?.address_line1 && meta?.city && meta?.region && meta?.postcode
      ? {
          line1: meta.address_line1,
          line2: meta.address_line2,
          city: meta.city,
          region: meta.region,
          postcode: meta.postcode,
        }
      : null;
  const total = breakdown.deliveryFee + breakdown.vat + breakdown.adminFee;
  const youPay = Math.max(0, total - breakdown.sponsorContribution);

  const rows = [
    { label: "Delivery fee", value: breakdown.deliveryFee },
    { label: "VAT", value: breakdown.vat },
    { label: "WeGive administration fee", value: breakdown.adminFee },
  ];

  return (
    <div className="container-page flex flex-col items-center py-14 sm:py-20">
      <div className="w-full max-w-lg">
        <BackButton className="mb-6" />
        <Eyebrow>Delivery</Eyebrow>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-foreground">
          Delivery details
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Distance: {breakdown.distanceKm} km, calculated server-side from
          the giver&apos;s location to yours.
        </p>

        <Card className="mt-6">
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium text-foreground">{formatCurrency(row.value, country)}</span>
              </div>
            ))}
            {item?.freeDelivery ? (
              <div className="flex items-center justify-between border-t border-border-strong pt-3 text-base font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-ink">{formatCurrency(total, country)}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">{formatCurrency(total, country)}</span>
                </div>
                {breakdown.sponsorContribution > 0 && (
                  <div className="flex items-center justify-between text-sm text-accent">
                    <span>Sponsor contribution</span>
                    <span>-{formatCurrency(breakdown.sponsorContribution, country)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border-strong pt-3 text-base font-semibold">
                  <span className="text-foreground">You pay</span>
                  <span className="text-ink">{formatCurrency(youPay, country)}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        <div className="mt-6">
          <AddressFields
            country={country}
            idPrefix="delivery"
            heading="Delivery address"
            helperText="Where should this be delivered? Your exact address is shared only with the assigned rider, once delivery is confirmed."
            profileAddress={profileAddress}
          />
        </div>

        {item?.freeDelivery ? (
          <div className="mt-6 border border-border-strong bg-brand-light/60 p-6 text-center">
            <p className="text-3xl">🚚</p>
            <p className="mt-3 text-sm font-semibold text-ink">
              Delivery is free: covered by the giver
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The giver committed to covering delivery when they listed this
              item. We&apos;ll charge them {formatCurrency(total, country)} now that the
              fee is calculated. You pay nothing.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <PaymentPanel
                amount={youPay}
                actionLabel="Pay"
                continueHref="/my-deliveries"
                continueLabel="Go to my deliveries"
                country={country}
              />
            </div>
            <p className="mt-6 text-center text-xs font-semibold text-muted-foreground">
              or
            </p>
            <div className="mt-3">
              <ShareSponsorLink giveawayId={id} />
            </div>
          </>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Prices are calculated and verified server-side, never trusted from
          the browser.
        </p>
      </div>
    </div>
  );
}
