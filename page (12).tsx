import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { adminNav } from "@/lib/portal-nav";
import { adminUsers } from "@/lib/mock-data";

export const metadata = { title: "Admin · Users" };

export default function AdminUsersPage() {
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Users"
      description="Search, review and manage user accounts and restrictions."
    >
      <SimpleTable
        columns={["Name", "Email", "Role", "Joined", "Status"]}
        rows={adminUsers.map((u) => [
          u.name,
          u.email,
          u.role,
          u.joined,
          <StatusBadge key="s" label={u.status} tone={u.status === "Active" ? "brand" : "warning"} />,
        ])}
      />
    </PortalShell>
  );
}
