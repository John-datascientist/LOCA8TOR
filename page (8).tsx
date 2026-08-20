import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { adminNav } from "@/lib/portal-nav";
import { adminReports } from "@/lib/mock-data";

export const metadata = { title: "Admin · Reports" };

export default function AdminReportsPage() {
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Reports"
      description="User-reported issues and platform-wide moderation reports."
    >
      <SimpleTable
        columns={["Subject", "Reported by", "Status"]}
        rows={adminReports.map((r) => [
          r.subject,
          r.reporter,
          <StatusBadge key="s" label={r.status} tone={r.status === "Open" ? "warning" : "brand"} />,
        ])}
      />
    </PortalShell>
  );
}
