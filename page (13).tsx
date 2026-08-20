import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { adminNav } from "@/lib/portal-nav";
import { adminRiders, adminBusinesses } from "@/lib/mock-data";

export const metadata = { title: "Admin · Verifications" };

export default function AdminVerificationsPage() {
  const pendingRiders = adminRiders.filter((r) => r.verification === "Pending");
  const pendingBusinesses = adminBusinesses.filter((b) => b.status === "Pending review");

  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Verifications"
      description="Recipient, rider and business verification requests awaiting review."
    >
      <h3 className="text-sm font-semibold text-foreground">Riders</h3>
      <SimpleTable
        columns={["Name", "Vehicle", "Status"]}
        rows={pendingRiders.map((r) => [r.name, r.vehicle, <StatusBadge key="s" label="Pending" tone="warning" />])}
      />
      <h3 className="text-sm font-semibold text-foreground">Businesses</h3>
      <SimpleTable
        columns={["Business", "Submitted", "Status"]}
        rows={pendingBusinesses.map((b) => [b.name, b.submitted, <StatusBadge key="s" label="Pending review" tone="warning" />])}
      />
    </PortalShell>
  );
}
