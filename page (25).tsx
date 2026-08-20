import { Card, Eyebrow } from "@/components/ui";
import { BackButton } from "@/components/back-button";
import { getSelectedCountry } from "@/lib/location-server";

const stages = [
  { label: "Delivery requested", done: true },
  { label: "Payment received", done: true },
  { label: "Rider assigned", done: true },
  { label: "Item collected", done: true },
  { label: "In transit", done: false },
  { label: "Delivered", done: false },
];

export default async function TrackDeliveryPage({
  params,
}: PageProps<"/delivery/[id]/track">) {
  const { id } = await params;
  const country = await getSelectedCountry();

  return (
    <div className="container-page flex flex-col items-center gap-8 py-14 sm:py-20">
      <div className="w-full max-w-lg">
        <BackButton />
      </div>
      <div className="max-w-lg text-center">
        <Eyebrow>Delivery {id}</Eyebrow>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-foreground">
          Live tracking
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {country === "NG"
            ? "Powered by Loca8tor tracking infrastructure."
            : "Live tracking from pickup to drop-off."}
        </p>
      </div>

      <div className="flex h-72 w-full max-w-2xl items-center justify-center border border-dashed border-border-strong bg-surface-muted text-sm text-muted-foreground">
        Live map placeholder
      </div>

      <Card className="w-full max-w-lg">
        <ol className="flex flex-col gap-4">
          {stages.map((stage) => (
            <li key={stage.label} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  stage.done
                    ? "bg-brand text-white"
                    : "bg-surface-muted text-muted-foreground"
                }`}
              >
                {stage.done ? "✓" : ""}
              </span>
              <span
                className={`text-sm ${
                  stage.done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stage.label}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
