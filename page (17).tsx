import { PortalShell } from "@/components/portal-shell";
import { StatCard, ListRow } from "@/components/portal-widgets";
import { Card, ButtonLink } from "@/components/ui";
import { businessNav } from "@/lib/portal-nav";
import { campaigns, businessDeliveries } from "@/lib/mock-data";

export const metadata = { title: "Business dashboard" };

export default function BusinessDashboardPage() {
  const activeCampaigns = campaigns.filter((c) => c.status === "Active").length;
  const itemsDonated = campaigns.reduce((sum, c) => sum + c.itemsListed, 0);
  const deliveriesSponsored = businessDeliveries.length;

  return (
    <PortalShell
      navItems={businessNav}
      portalLabel="Business"
      title="Business dashboard"
      description="An overview of your organization's giving on WeGive."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active campaigns" value={String(activeCampaigns)} />
        <StatCard label="Items donated" value={String(itemsDonated)} />
        <StatCard label="Deliveries sponsored" value={String(deliveriesSponsored)} />
      </div>
      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Recent deliveries</h3>
          <ButtonLink href="/business/deliveries" variant="ghost">
            View all →
          </ButtonLink>
        </div>
        {businessDeliveries.map((d) => (
          <ListRow key={d.id} title={d.itemTitle} subtitle={d.recipientArea} status={d.status} />
        ))}
      </Card>
    </PortalShell>
  );
}
