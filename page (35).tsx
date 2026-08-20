import { PortalShell } from "@/components/portal-shell";
import { ListRow, EmptyState } from "@/components/portal-widgets";
import { Card, ButtonLink } from "@/components/ui";
import { userNav } from "@/lib/portal-nav";
import { myClaims } from "@/lib/mock-data";

export const metadata = { title: "My claims" };

export default function MyClaimsPage() {
  return (
    <PortalShell
      navItems={userNav}
      portalLabel="Your account"
      title="My claims"
      description="Items you've claimed. A claim reserves an item for you while delivery is arranged."
    >
      {myClaims.length === 0 ? (
        <EmptyState
          title="No claims yet"
          description="When you claim an item someone's giving away, it'll show up here."
          action={<ButtonLink href="/browse">Browse giveaways</ButtonLink>}
        />
      ) : (
        <Card>
          {myClaims.map((c) => (
            <ListRow
              key={c.id}
              title={c.itemTitle}
              subtitle={`From ${c.giverArea} · ${c.detail}`}
              status={c.status}
            />
          ))}
        </Card>
      )}
    </PortalShell>
  );
}
