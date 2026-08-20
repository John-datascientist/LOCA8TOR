import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui";

export type LegalSection = {
  heading: string;
  body: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="container-page flex justify-center py-14 sm:py-20">
      <div className="w-full max-w-3xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="label-caps mt-3 text-[11px] font-semibold text-muted-foreground">
          Last updated {updated}
        </p>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
          {intro}
        </p>

        <div className="mt-10 flex flex-col divide-y divide-border border-t border-border-strong">
          {sections.map((section, i) => (
            <div key={section.heading} className="flex flex-col gap-3 py-8 sm:flex-row sm:gap-8">
              <div className="flex shrink-0 items-baseline gap-3 sm:w-56">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">
                  {section.heading}
                </h2>
              </div>
              <div className="flex flex-1 flex-col gap-3 text-sm leading-6 text-muted-foreground">
                {section.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
