import { Card, Eyebrow } from "@/components/ui";

export const metadata = { title: "Contact" };

const channels = [
  { label: "General support", value: "hello@wegive.app", note: "Giving, claiming or account questions" },
  { label: "Delivery & payments", value: "payments@wegive.app", note: "Escrow, fees, sponsorships and refunds" },
  { label: "Trust & safety", value: "safety@wegive.app", note: "Report a listing, message or delivery" },
  { label: "Business", value: "business@wegive.app", note: "Bulk giveaways, corporate giving balance" },
];

const topics = [
  "General question",
  "Giving & claiming",
  "Delivery & payments",
  "Business",
  "Safety concern",
  "Press",
];

export default function ContactPage() {
  return (
    <div className="container-page flex flex-col gap-8 py-14 sm:py-20">
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>Contact</Eyebrow>
        <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          Get in touch
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Questions about a giveaway, a delivery, or WeGive for your
          business? Send us a message. We reply within 1–2 business days.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-3">
          {channels.map((c) => (
            <Card key={c.label} className="flex flex-col gap-1">
              <span className="label-caps text-[11px] font-semibold text-muted-foreground">
                {c.label}
              </span>
              <a
                href={`mailto:${c.value}`}
                className="text-base font-semibold text-ink underline decoration-1 underline-offset-4"
              >
                {c.value}
              </a>
              <span className="text-xs text-muted-foreground">{c.note}</span>
            </Card>
          ))}
          <p className="px-1 text-xs text-muted-foreground">
            WeGive HQ · Lagos, Nigeria. A Workerholics Solutions company.
          </p>
        </div>

        <Card className="h-fit">
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="label-caps text-xs font-semibold text-foreground">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
                placeholder="Your name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="label-caps text-xs font-semibold text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="topic" className="label-caps text-xs font-semibold text-foreground">
                Topic
              </label>
              <select
                id="topic"
                name="topic"
                defaultValue={topics[0]}
                className="border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
              >
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="label-caps text-xs font-semibold text-foreground">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                className="border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
                placeholder="How can we help?"
              />
            </div>
            <button
              type="submit"
              className="label-caps mt-2 inline-flex items-center justify-center border border-ink bg-ink px-5 py-3.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink"
            >
              Send message
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
