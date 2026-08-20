import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { adminNav } from "@/lib/portal-nav";
import { adminBusinesses } from "@/lib/mock-data";

export const metadata = { title: "Admin · Businesses" };

export default function AdminBusinessesPage() {
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Businesses"
      description="Review business verification requests and manage verified business accounts."
    >
      <SimpleTable
        columns={["Business", "Submitted", "Status"]}
        rows={adminBusinesses.map((b) => [
          b.name,
          b.submitted,
          <StatusBadge key="s" label={b.status} tone={b.status === "Verified" ? "brand" : "warning"} />,
        ])}
      />
    </PortalShell>
  );
}
