import { ButtonLink, Card, Eyebrow } from "@/components/ui";

export const metadata = { title: "Give something away" };

const categories = [
  {
    heading: "Furniture",
    items: ["Item name & dimensions", "Weight / estimated weight", "Condition & photos", "Pickup requirements"],
  },
  {
    heading: "Electronics",
    items: ["Item, brand & model", "Condition", "Working / not working", "Photos"],
  },
  {
    heading: "Food",
    items: ["Food type & quantity", "Packaged or cooked", "Best-before / expiry", "Storage & allergens"],
  },
];

export default function GivePage() {
  return (
    <div className="container-page flex flex-col gap-10 py-14 sm:py-20">
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>Give</Eyebrow>
        <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          Give something away
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          List an item in minutes. The form adapts to what you&apos;re
          giving, so you&apos;re never faced with a giant generic form, and
          you can choose to cover delivery for whoever claims it.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.heading}>
            <h3 className="text-sm font-semibold text-foreground">{c.heading}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {c.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col items-start gap-4 bg-brand-light/60 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">
          Ready when you are: the form only asks what matters for your
          item&apos;s category.
        </p>
        <ButtonLink href="/giveaway/create" variant="primary" className="w-full sm:w-auto">
          Create a giveaway
        </ButtonLink>
      </Card>
    </div>
  );
}
