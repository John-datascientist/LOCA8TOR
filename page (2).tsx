import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { adminNav } from "@/lib/portal-nav";
import { adminClaims } from "@/lib/mock-data";

export const metadata = { title: "Admin · Claims" };

function toneFor(status: string): "brand" | "warning" | "neutral" {
  if (status.startsWith("Expired")) return "neutral";
  if (status === "Reserved") return "brand";
  return "warning";
}

export default function AdminClaimsPage() {
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Claims"
      description="Monitor reservations and claim disputes across the platform."
    >
      <SimpleTable
        columns={["Item", "Claimant", "Status"]}
        rows={adminClaims.map((c) => [
          c.itemTitle,
          c.claimant,
          <StatusBadge key="s" label={c.status} tone={toneFor(c.status)} />,
        ])}
      />
    </PortalShell>
  );
}
