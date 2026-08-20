import { Card, Eyebrow, ButtonLink } from "@/components/ui";
import { BackButton } from "@/components/back-button";
import { FreeDeliveryBadge } from "@/components/free-delivery-badge";
import { ShareSponsorLink } from "@/components/share-sponsor-link";
import { canClaimMore, nearbyGiveaways } from "@/lib/mock-data";

const lifecycle = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "AVAILABLE",
  "RESERVED",
  "CLAIMED",
  "DELIVERY_PENDING",
  "DELIVERED",
  "COMPLETED",
];

export default async function GiveawayDetailPage({
  params,
}: PageProps<"/giveaway/[id]">) {
  const { id } = await params;
  const item = nearbyGiveaways.find((g) => g.id === id) ?? {
    id,
    title: "Giveaway item",
    category: "General",
    subcategory: "",
    location: "Nearby",
    state: "",
    country: "NG" as const,
    distanceKm: 3.0,
    condition: "Good condition",
    emoji: "🎁",
    freeDelivery: false,
  };

  return (
    <div className="container-page py-14 sm:py-20">
      <BackButton label="Back to browse" className="mb-6" />
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-6">
        <div className="flex h-72 items-center justify-center bg-brand-light text-7xl">
          {item.emoji}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <Eyebrow>{item.category}</Eyebrow>
            {item.freeDelivery && <FreeDeliveryBadge />}
          </div>
          <h1 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground">
            {item.title}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {item.location} · Approximately {item.distanceKm} km away
          </p>
        </div>
        <Card>
          <h3 className="text-sm font-semibold text-foreground">Details</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Condition</dt>
              <dd className="text-foreground">{item.condition}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-foreground">Available</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-foreground">Lifecycle</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {lifecycle.map((stage, i) => (
              <span
                key={stage}
                className={`label-caps border px-3 py-1 text-[11px] font-semibold ${
                  i === 3
                    ? "border-ink bg-ink text-surface"
                    : "border-border bg-surface-muted text-muted-foreground"
                }`}
              >
                {stage}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {canClaimMore() ? (
          <Card className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">
              Interested in this item?
            </h3>
            <p className="text-sm text-muted-foreground">
              Claiming reserves this item for a limited time while delivery
              is arranged. The exact pickup address is shared only once your
              claim is confirmed.
            </p>
            <ButtonLink href={`/giveaway/${item.id}/claim`} variant="primary">
              Claim this item
            </ButtonLink>
            {item.freeDelivery && (
              <p className="label-caps text-center text-[11px] font-semibold text-accent-dark">
                🚚 The giver is covering delivery: free for whoever claims this.
              </p>
            )}
          </Card>
        ) : (
          <Card className="flex flex-col gap-4 border-border-strong bg-warn-light/60">
            <h3 className="text-sm font-semibold text-ink">
              🔒 Give once to claim again
            </h3>
            <p className="text-sm text-ink/80">
              You&apos;ve used your first claim. List something you no
              longer need to unlock the ability to claim more, it keeps
              WeGive a two-way exchange instead of a one-way stream.
            </p>
            <ButtonLink href="/giveaway/create" variant="primary">
              List a giveaway
            </ButtonLink>
          </Card>
        )}
        {!item.freeDelivery && <ShareSponsorLink giveawayId={item.id} />}
      </div>
      </div>
    </div>
  );
}
