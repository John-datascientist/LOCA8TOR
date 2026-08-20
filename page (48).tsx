import { PortalShell } from "@/components/portal-shell";
import { riderNav } from "@/lib/portal-nav";

export const metadata = { title: "Navigation" };

export default function RiderNavigationPage() {
  return (
    <PortalShell
      navItems={riderNav}
      portalLabel="Rider"
      title="Navigation"
      description="Turn-by-turn routing for your active delivery, powered by Loca8tor."
    >
      <div className="flex h-80 w-full items-center justify-center border border-dashed border-border-strong bg-surface-muted text-sm text-muted-foreground">
        Navigation map placeholder
      </div>
    </PortalShell>
  );
}
