import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { riderNav } from "@/lib/portal-nav";

export const metadata = { title: "Rider profile" };

const checks = ["Identity", "Phone", "Vehicle", "Driving / rider credentials", "Insurance / documentation"];

export default function RiderProfilePage() {
  return (
    <PortalShell
      navItems={riderNav}
      portalLabel="Rider"
      title="Rider profile"
      description="Your verification status, sourced from your Loca8tor rider profile."
    >
      <Card>
        <h3 className="text-sm font-semibold text-foreground">Verification checklist</h3>
        <ul className="mt-3 space-y-2.5 text-sm">
          {checks.map((c) => (
            <li key={c} className="flex items-center justify-between border-b border-border pb-2.5 last:border-none">
              <span className="text-foreground/80">{c}</span>
              <span className="label-caps bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                Pending
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </PortalShell>
  );
}
