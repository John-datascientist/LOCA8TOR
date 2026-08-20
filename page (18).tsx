import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { businessNav } from "@/lib/portal-nav";
import { businessDeliveries } from "@/lib/mock-data";

export const metadata = { title: "Business deliveries" };

const tone: Record<string, "brand" | "warning" | "neutral"> = {
  Delivered: "brand",
  "In transit": "warning",
  "Awaiting pickup": "neutral",
};

export default function BusinessDeliveriesPage() {
  return (
    <PortalShell
      navItems={businessNav}
      portalLabel="Business"
      title="Deliveries"
      description="Deliveries linked to your campaigns and donations."
    >
      <SimpleTable
        columns={["Item", "Recipient area", "Status"]}
        rows={businessDeliveries.map((d) => [
          d.itemTitle,
          d.recipientArea,
          <StatusBadge key="s" label={d.status} tone={tone[d.status] ?? "neutral"} />,
        ])}
      />
    </PortalShell>
  );
}
