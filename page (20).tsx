import { PortalShell } from "@/components/portal-shell";
import { StatCard } from "@/components/portal-widgets";
import { businessNav } from "@/lib/portal-nav";
import { campaigns } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

export const metadata = { title: "Impact" };

export default async function BusinessImpactPage() {
  const country = await getSelectedCountry();
  const itemsDelivered = campaigns.reduce((sum, c) => sum + c.itemsListed, 0);

  return (
    <PortalShell
      navItems={businessNav}
      portalLabel="Business"
      title="Impact reporting"
      description="See the real-world reach of your organization's giving."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="People reached" value="211" />
        <StatCard label="Items delivered" value={String(itemsDelivered)} />
        <StatCard label="Delivery cost sponsored" value={formatCurrency(184500, country)} />
      </div>
    </PortalShell>
  );
}
