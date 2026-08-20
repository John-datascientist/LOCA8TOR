import { PortalShell } from "@/components/portal-shell";
import { Card, ButtonLink } from "@/components/ui";
import { EmptyState } from "@/components/portal-widgets";
import { userNav } from "@/lib/portal-nav";
import { formatCurrency } from "@/lib/location";
import { getSelectedCountry } from "@/lib/location-server";

export const metadata = { title: "My sponsorships" };

// No real backend for sponsorships yet, so a fresh account starts empty
// rather than inheriting the old demo persona's contributions.
const mySponsored: { id: string; itemTitle: string; recipientArea: string; fundedAmount: number; totalFee: number; myContribution: number }[] = [];

export default async function MySponsorshipsPage() {
  const country = await getSelectedCountry();
  return (
    <PortalShell
      navItems={userNav}
      portalLabel="Your account"
      title="My sponsorships"
      description="Deliveries you've helped fund, and how much of each is still needed."
    >
      {mySponsored.length === 0 ? (
        <EmptyState
          title="No sponsorships yet"
          description="Sponsor a delivery to help cover someone's delivery fee, and it'll show up here."
          action={<ButtonLink href="/sponsor">Browse deliveries to sponsor</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {mySponsored.map((s) => {
            const pct = Math.min(100, Math.round((s.fundedAmount / s.totalFee) * 100));
            return (
              <Card key={s.id} className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.itemTitle}</p>
                  <p className="text-xs text-muted-foreground">Delivering to {s.recipientArea}</p>
                </div>
                <div className="h-1.5 w-full overflow-hidden bg-surface-muted">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-sm text-muted-foreground">
                  You contributed <span className="font-semibold text-foreground">{formatCurrency(s.myContribution, country)}</span>{" "}
                  of {formatCurrency(s.totalFee, country)} ({pct}% funded)
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
