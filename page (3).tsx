import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { adminNav } from "@/lib/portal-nav";
import { adminDeliveries } from "@/lib/mock-data";

export const metadata = { title: "Admin · Deliveries" };

function toneFor(status: string): "brand" | "warning" | "neutral" {
  if (status === "Delivered") return "brand";
  if (status === "Awaiting rider") return "neutral";
  return "warning";
}

export default function AdminDeliveriesPage() {
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Deliveries"
      description="All delivery orders, their status, rider assignment and payment status."
    >
      <SimpleTable
        columns={["Item", "Rider", "Status"]}
        rows={adminDeliveries.map((d) => [
          d.itemTitle,
          d.rider,
          <StatusBadge key="s" label={d.status} tone={toneFor(d.status)} />,
        ])}
      />
    </PortalShell>
  );
}
