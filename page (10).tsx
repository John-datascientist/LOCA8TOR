import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { adminNav } from "@/lib/portal-nav";

export const metadata = { title: "Admin · Settings" };

const settingGroups = [
  "Giveaway categories",
  "Restricted & prohibited categories",
  "Verification requirements",
  "Delivery pricing",
  "VAT configuration",
  "WeGive administration fee",
  "Vehicle pricing",
  "Sponsorship settings",
  "Claim limits",
  "Reservation duration",
  "User restrictions",
  "Rider requirements",
];

export default function AdminSettingsPage() {
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Platform settings"
      description="Configure WeGive without touching code. Every change here is written to the audit log."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingGroups.map((s) => (
          <Card key={s} className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{s}</span>
            <span className="text-xs font-semibold text-brand">Configure</span>
          </Card>
        ))}
      </div>
    </PortalShell>
  );
}
