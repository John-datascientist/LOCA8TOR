import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { adminNav } from "@/lib/portal-nav";
import { adminGiveawayQueue } from "@/lib/mock-data";

export const metadata = { title: "Admin · Giveaways" };

export default function AdminGiveawaysPage() {
  return (
    <PortalShell
      navItems={adminNav}
      portalLabel="Admin"
      title="Giveaways"
      description="Review listings pending approval and moderate active giveaways."
    >
      <div className="flex flex-col gap-3">
        {adminGiveawayQueue.map((g) => (
          <Card key={g.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{g.title}</p>
              <p className="text-xs text-muted-foreground">
                {g.category} · Submitted by {g.giver} · {g.submitted}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="label-caps border border-border-strong px-4 py-1.5 text-[11px] font-semibold text-foreground/70 hover:border-red-400 hover:text-red-600">
                Reject
              </button>
              <button className="label-caps border border-ink bg-ink px-4 py-1.5 text-[11px] font-semibold text-surface hover:bg-transparent hover:text-ink">
                Approve
              </button>
            </div>
          </Card>
        ))}
      </div>
    </PortalShell>
  );
}
