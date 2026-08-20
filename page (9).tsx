import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { adminNav } from "@/lib/portal-nav";
import { adminRiders } from "@/lib/mock-data";

export const metadata = { title: "Admin · Riders" };

const tone: Record<string, "brand" | "warning" | "neutral"> = {
  Verified: "brand",
  Pending: "warning",
  Rejected: "neutral",
};

export default function AdminRidersPage() {
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Riders"
      description="Riders eligible for WeGive deliveries, sourced from their verified Loca8tor profile."
    >
      <SimpleTable
        columns={["Name", "Vehicle", "Verification"]}
        rows={adminRiders.map((r) => [
          r.name,
          r.vehicle,
          <StatusBadge key="s" label={r.verification} tone={tone[r.verification]} />,
        ])}
      />
    </PortalShell>
  );
}
