import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { adminNav } from "@/lib/portal-nav";

export const metadata = { title: "Admin · Live map" };

export default function AdminLiveMapPage() {
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Live map"
      description="All active, authorized deliveries in real time, powered by Loca8tor tracking infrastructure."
    >
      <div className="flex h-96 w-full items-center justify-center border border-dashed border-border-strong bg-surface-muted text-sm text-muted-foreground">
        Live map placeholder: active deliveries will render here
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-foreground">Marker details</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Each marker shows rider, vehicle, delivery ID, status, pickup,
          destination, last update and speed where appropriate. Click a
          marker to view the trip.
        </p>
      </Card>
    </PortalShell>
  );
}
