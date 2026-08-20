import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { businessNav } from "@/lib/portal-nav";

export const metadata = { title: "Business giving" };

export default function BusinessGivePage() {
  return (
    <PortalShell
      navItems={businessNav}
      portalLabel="Business"
      title="Give as a business"
      description="List surplus stock in bulk, or set eligibility requirements so only verified recipients can claim."
    >
      <Card>
        <h3 className="text-sm font-semibold text-foreground">Eligibility requirements</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          For example: verified families, students, or a specific food
          assistance campaign. Sensitive recipient information is never made
          publicly visible.
        </p>
      </Card>
      <Card>
        <h3 className="text-sm font-semibold text-foreground">Bulk listings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload multiple items at once instead of creating listings one by
          one.
        </p>
      </Card>
    </PortalShell>
  );
}
