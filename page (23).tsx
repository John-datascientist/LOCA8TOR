import { PortalShell } from "@/components/portal-shell";
import { StatCard, ListRow, EmptyState } from "@/components/portal-widgets";
import { Card, ButtonLink } from "@/components/ui";
import { userNav } from "@/lib/portal-nav";
import {
  canClaimMore,
  currentUserStanding,
  myGiveaways,
  myClaims,
  myDeliveries,
} from "@/lib/mock-data";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const activeGiveaways = myGiveaways.filter((g) => g.status !== "COMPLETED").length;
  const openClaims = myClaims.filter((c) => c.status !== "Delivered").length;
  const deliveriesInProgress = myDeliveries.filter((d) => d.status !== "Delivered").length;
  const claimLocked = !canClaimMore();

  return (
    <PortalShell
      navItems={userNav}
      portalLabel="Your account"
      title="Welcome back"
      description="A quick overview of your giveaways, claims, deliveries and sponsorships."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active giveaways" value={String(activeGiveaways)} hint="Items you're giving away" />
        <StatCard label="Open claims" value={String(openClaims)} hint="Items you've claimed" />
        <StatCard label="Deliveries in progress" value={String(deliveriesInProgress)} hint="On their way to you" />
      </div>

      <Card className={claimLocked ? "border-border-strong bg-warn-light/60" : ""}>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {claimLocked ? "🔒 Give once to claim again" : "You're clear to claim"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentUserStanding.claimsMade} claim{currentUserStanding.claimsMade === 1 ? "" : "s"} made, {currentUserStanding.givesMade} giveaway{currentUserStanding.givesMade === 1 ? "" : "s"} listed.{" "}
              {claimLocked
                ? "List something you no longer need to unlock your next claim."
                : "Keep giving and claiming in balance."}
            </p>
          </div>
          {claimLocked && (
            <ButtonLink href="/giveaway/create" variant="primary" className="w-full sm:w-auto">
              List a giveaway
            </ButtonLink>
          )}
        </div>
      </Card>

      {myDeliveries.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Browse what's available nearby, or list something you no longer need."
          action={
            <div className="flex gap-3">
              <ButtonLink href="/browse">Browse giveaways</ButtonLink>
              <ButtonLink href="/giveaway/create" variant="ghost">
                List a giveaway
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
            <ButtonLink href="/my-deliveries" variant="ghost">
              View all deliveries →
            </ButtonLink>
          </div>
          {myDeliveries.slice(0, 3).map((d) => (
            <ListRow key={d.id} title={d.itemTitle} subtitle={d.stage} status={d.status} />
          ))}
        </Card>
      )}
    </PortalShell>
  );
}
