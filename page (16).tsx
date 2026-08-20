import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { businessNav } from "@/lib/portal-nav";
import { campaigns } from "@/lib/mock-data";

export const metadata = { title: "Campaigns" };

export default function BusinessCampaignsPage() {
  return (
    <PortalShell
      navItems={businessNav}
      portalLabel="Business"
      title="Campaigns"
      description="Group related giveaways, like 'School supplies for students', under one campaign."
    >
      <SimpleTable
        columns={["Campaign", "Eligibility", "Items listed", "Status"]}
        rows={campaigns.map((c) => [
          c.name,
          c.eligibility,
          String(c.itemsListed),
          <StatusBadge key="s" label={c.status} tone={c.status === "Active" ? "brand" : "neutral"} />,
        ])}
      />
    </PortalShell>
  );
}
