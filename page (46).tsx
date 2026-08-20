import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { BackButton } from "@/components/back-button";
import { riderNav } from "@/lib/portal-nav";

export default async function RiderDeliveryDetailPage({
  params,
}: PageProps<"/rider/delivery/[id]">) {
  const { id } = await params;

  return (
    <PortalShell
      navItems={riderNav}
      portalLabel="Rider"
      title={`Delivery ${id}`}
      description="Pickup and drop-off details for this delivery."
    >
      <BackButton label="Back to deliveries" />
      <Card className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">Pickup</p>
          <p className="text-foreground">Shared once you accept</p>
        </div>
        <div>
          <p className="text-muted-foreground">Drop-off</p>
          <p className="text-foreground">Shared once you accept</p>
        </div>
        <div>
          <p className="text-muted-foreground">Vehicle type</p>
          <p className="text-foreground">Motorcycle</p>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <p className="text-foreground">Assigned</p>
        </div>
      </Card>
    </PortalShell>
  );
}
