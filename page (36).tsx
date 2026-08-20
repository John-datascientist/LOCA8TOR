import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { Card, ButtonLink } from "@/components/ui";
import { EmptyState } from "@/components/portal-widgets";
import { userNav } from "@/lib/portal-nav";
import { myDeliveries } from "@/lib/mock-data";

export const metadata = { title: "My deliveries" };

export default function MyDeliveriesPage() {
  return (
    <PortalShell
      navItems={userNav}
      portalLabel="Your account"
      title="My deliveries"
      description="Track deliveries in progress and view your delivery history."
    >
      {myDeliveries.length === 0 ? (
        <EmptyState
          title="No deliveries yet"
          description="Claim an item or list a giveaway to start a delivery."
          action={<ButtonLink href="/browse">Browse giveaways</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {myDeliveries.map((d) => (
            <Link key={d.id} href={`/delivery/${d.id}/track`}>
              <Card className="flex h-full flex-col gap-2 transition-shadow hover:shadow-md">
                <p className="text-sm font-semibold text-foreground">{d.itemTitle}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{d.status}</p>
                <p className="text-sm text-muted-foreground">{d.stage}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
