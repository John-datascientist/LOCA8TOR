import { PortalShell } from "@/components/portal-shell";
import { StatCard, ListRow } from "@/components/portal-widgets";
import { Card } from "@/components/ui";
import { adminNav } from "@/lib/portal-nav";
import {
  adminGiveawayQueue,
  adminDeliveries,
  adminRiders,
  adminBusinesses,
} from "@/lib/mock-data";

export const metadata = { title: "Admin overview" };

export default function AdminOverviewPage() {
  const activeDeliveries = adminDeliveries.filter((d) => d.status !== "Delivered").length;
  const verifiedRiders = adminRiders.filter((r) => r.verification === "Verified").length;
  const verifiedBusinesses = adminBusinesses.filter((b) => b.status === "Verified").length;

  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Platform overview"
      description="A snapshot of activity across WeGive."
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Pending reviews" value={String(adminGiveawayQueue.length)} />
        <StatCard label="Active deliveries" value={String(activeDeliveries)} />
        <StatCard label="Verified riders" value={String(verifiedRiders)} />
        <StatCard label="Verified businesses" value={String(verifiedBusinesses)} />
      </div>
      <Card>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Listings awaiting review</h3>
        {adminGiveawayQueue.map((g) => (
          <ListRow key={g.id} title={g.title} subtitle={`${g.category} · ${g.giver}`} status={g.submitted} />
        ))}
      </Card>
    </PortalShell>
  );
}
