import { PortalShell } from "@/components/portal-shell";
import { SimpleTable, StatusBadge } from "@/components/portal-widgets";
import { adminNav } from "@/lib/portal-nav";
import { openSponsorships } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

export const metadata = { title: "Admin · Sponsors" };

const sponsorNames = ["Ada Lovelace", "Kingsley Corp.", "Anonymous"];

export default async function AdminSponsorsPage() {
  const country = await getSelectedCountry();
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Sponsors"
      description="Individuals and businesses sponsoring deliveries, and sponsorship settings."
    >
      <SimpleTable
        columns={["Delivery", "Sponsor", "Funded", "Status"]}
        rows={openSponsorships.map((s, i) => {
          const pct = Math.round((s.fundedAmount / s.totalFee) * 100);
          return [
            s.itemTitle,
            sponsorNames[i] ?? "Anonymous",
            `${formatCurrency(s.fundedAmount, country)} of ${formatCurrency(s.totalFee, country)}`,
            <StatusBadge key="s" label={pct >= 100 ? "Fully funded" : `${pct}% funded`} tone={pct >= 100 ? "brand" : "warning"} />,
          ];
        })}
      />
    </PortalShell>
  );
}
