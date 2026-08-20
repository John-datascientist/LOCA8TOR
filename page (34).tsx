import { PortalShell } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { userNav } from "@/lib/portal-nav";
import { conversations } from "@/lib/mock-data";

export const metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <PortalShell
      navItems={userNav}
      portalLabel="Your account"
      title="Messages"
      description="Conversations open only once a claim or active delivery connects you with someone."
    >
      <Card className="grid gap-0 overflow-hidden p-0 sm:grid-cols-[1.1fr_1.4fr]">
        <div className="divide-y divide-border border-b border-border sm:border-b-0 sm:border-r">
          {conversations.map((c, i) => (
            <div
              key={c.id}
              className={`flex items-start gap-3 px-4 py-3 ${i === 0 ? "bg-brand-light/50" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand-dark">
                {c.withName.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{c.withName}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{c.timeAgo}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.role}</p>
                <p className="mt-1 truncate text-sm text-foreground/70">{c.lastMessage}</p>
              </div>
              {c.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
            </div>
          ))}
        </div>
        <div className="hidden flex-col items-center justify-center gap-2 px-6 py-16 text-center sm:flex">
          <p className="text-sm font-semibold text-foreground">Select a conversation</p>
          <p className="text-sm text-muted-foreground">
            Messages with {conversations[0]?.withName} will appear here.
          </p>
        </div>
      </Card>
    </PortalShell>
  );
}
