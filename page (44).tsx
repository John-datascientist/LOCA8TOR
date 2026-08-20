import { PortalShell } from "@/components/portal-shell";
import { StatCard, ListRow } from "@/components/portal-widgets";
import { Card } from "@/components/ui";
import { riderNav } from "@/lib/portal-nav";
import { riderDeliveries } from "@/lib/mock-data";

export const metadata = { title: "Rider dashboard" };

export default function RiderDashboardPage() {
  const active = riderDeliveries.filter((d) => d.status !== "Completed");

  return (
    <PortalShell
      navItems={riderNav}
      portalLabel="Rider"
      title="Rider dashboard"
      description="Your rider profile, powered by your verified Loca8tor profile."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Deliveries today" value={String(active.length)} />
        <StatCard label="Deliveries this week" value={String(riderDeliveries.length)} />
        <StatCard label="Rating" value="4.9" />
      </div>
      <Card>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Active deliveries</h3>
        {active.map((d) => (
          <ListRow
            key={d.id}
            title={d.itemTitle}
            subtitle={`${d.pickupArea} → ${d.dropoffArea}`}
            status={d.status}
          />
        ))}
      </Card>
    </PortalShell>
  );
}
