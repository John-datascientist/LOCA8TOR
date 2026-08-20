import { Card, Eyebrow, ButtonLink } from "@/components/ui";
import { BackButton } from "@/components/back-button";

export default async function ClaimPage({
  params,
}: PageProps<"/giveaway/[id]/claim">) {
  const { id } = await params;

  return (
    <div className="container-page flex flex-col items-center py-14 sm:py-20">
      <div className="mb-6 w-full max-w-lg">
        <BackButton />
      </div>
      <Card className="w-full max-w-lg text-center">
        <Eyebrow>Reserved</Eyebrow>
        <h1 className="mt-3 text-2xl font-black uppercase tracking-tight text-foreground">
          Reserved for you for 30 minutes
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          If a delivery isn&apos;t requested and funded before the timer runs
          out, this item returns to Available so someone else can claim it.
        </p>
        <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-ink text-xl font-semibold text-ink">
          29:41
        </div>
        <ButtonLink href={`/giveaway/${id}/delivery`} variant="primary" className="mt-6 w-full">
          Arrange delivery
        </ButtonLink>
      </Card>
    </div>
  );
}
