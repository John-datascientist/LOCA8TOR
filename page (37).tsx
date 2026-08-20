import { PortalShell } from "@/components/portal-shell";
import { ListRow, EmptyState } from "@/components/portal-widgets";
import { Card, ButtonLink } from "@/components/ui";
import { PaymentPanel } from "@/components/payment-panel";
import { FreeDeliveryBadge } from "@/components/free-delivery-badge";
import { userNav } from "@/lib/portal-nav";
import { myGiveaways } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

export const metadata = { title: "My giveaways" };

export default async function MyGiveawaysPage() {
  const country = await getSelectedCountry();
  const needsPayment = myGiveaways.filter((g) => g.freeDelivery && g.deliveryFeeDue);
  const rest = myGiveaways.filter((g) => !(g.freeDelivery && g.deliveryFeeDue));

  return (
    <PortalShell
      navItems={userNav}
      portalLabel="Your account"
      title="My giveaways"
      description="Items you've listed, from draft through to completed."
    >
      <div className="flex justify-end">
        <ButtonLink href="/giveaway/create">Create a giveaway</ButtonLink>
      </div>

      {needsPayment.map((g) => (
        <Card key={g.id} className="flex flex-col gap-4 border-border-strong">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{g.title}</p>
              <p className="text-xs text-muted-foreground">
                Someone claimed this {formatCurrency(g.deliveryFeeDue!, country)}. You committed to cover delivery.
              </p>
            </div>
            <FreeDeliveryBadge />
          </div>
          <PaymentPanel
            amount={g.deliveryFeeDue!}
            actionLabel="Pay"
            continueHref="/my-giveaways"
            continueLabel="Done"
            country={country}
          />
        </Card>
      ))}

      {rest.length === 0 && needsPayment.length === 0 ? (
        <EmptyState
          title="No giveaways yet"
          description="List something you no longer need and it'll show up here."
          action={<ButtonLink href="/giveaway/create">Create a giveaway</ButtonLink>}
        />
      ) : (
        rest.length > 0 && (
          <Card>
            {rest.map((g) => (
              <ListRow
                key={g.id}
                title={g.title}
                subtitle={`${g.category} · ${g.claims} claim${g.claims === 1 ? "" : "s"} · updated ${g.updated}`}
                status={g.status.replace(/_/g, " ")}
              />
            ))}
          </Card>
        )
      )}
    </PortalShell>
  );
}
