import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { riderNav } from "@/lib/portal-nav";
import { riderDeliveries } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

export const metadata = { title: "Rider deliveries" };

export default async function RiderDeliveriesPage() {
  const country = await getSelectedCountry();
  return (
    <PortalShell
      navItems={riderNav}
      portalLabel="Rider"
      title="Deliveries"
      description="Assigned pickups and drop-offs, from collection to confirmed delivery."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {riderDeliveries.map((d) => (
          <Link key={d.id} href={`/rider/delivery/${d.id}`}>
            <Card className="flex h-full flex-col gap-2 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{d.itemTitle}</p>
                <span className="text-sm font-semibold text-brand-dark">{formatCurrency(d.fee, country)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {d.pickupArea} → {d.dropoffArea}
              </p>
              <span className="label-caps mt-auto w-fit bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-ink">
                {d.status}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </PortalShell>
  );
}
