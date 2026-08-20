import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { userNav } from "@/lib/portal-nav";
import { notifications } from "@/lib/mock-data";

export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <PortalShell
      navItems={userNav}
      portalLabel="Your account"
      title="Notifications"
      description="Updates on your giveaways, claims, deliveries and sponsorships."
    >
      <Card className="divide-y divide-border p-0">
        {notifications.map((n) => (
          <div key={n.id} className="flex items-start gap-3 px-5 py-4">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-border" : "bg-brand"}`}
            />
            <div className="flex-1">
              <p className={`text-sm ${n.read ? "text-foreground/70" : "font-medium text-foreground"}`}>
                {n.message}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.category} · {n.timeAgo}
                {n.channels && ` · sent via ${n.channels.join(" & ")}`}
              </p>
            </div>
          </div>
        ))}
      </Card>
    </PortalShell>
  );
}
