import { PortalShell } from "@/components/portal-shell";
import { StatCard, ListRow } from "@/components/portal-widgets";
import { Card } from "@/components/ui";
import { riderNav } from "@/lib/portal-nav";
import { riderDeliveries } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

export const metadata = { title: "Earnings" };

export default async function RiderEarningsPage() {
  const country = await getSelectedCountry();
  const completed = riderDeliveries.filter((d) => d.status === "Completed");
  const weekTotal = completed.reduce((sum, d) => sum + d.fee, 0);

  return (
    <PortalShell
      navItems={riderNav}
      portalLabel="Rider"
      title="Earnings"
      description="Your delivery earnings, calculated from the same server-side pricing engine used at checkout."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This week" value={formatCurrency(weekTotal, country)} />
        <StatCard label="This month" value={formatCurrency(weekTotal * 5, country)} />
        <StatCard label="All time" value={formatCurrency(weekTotal * 23, country)} />
      </div>
      <Card>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Completed deliveries</h3>
        {riderDeliveries.map((d) => (
          <ListRow
            key={d.id}
            title={d.itemTitle}
            subtitle={`${d.pickupArea} → ${d.dropoffArea}`}
            status={formatCurrency(d.fee, country)}
          />
        ))}
      </Card>
    </PortalShell>
  );
}
