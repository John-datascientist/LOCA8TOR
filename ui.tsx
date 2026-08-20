import Link from "next/link";
import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="label-caps inline-flex w-fit items-center gap-2 text-xs font-semibold text-muted-foreground before:h-px before:w-5 before:bg-border-strong">
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: { href: string; label: string };
}) {
  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${
        align === "center" ? "text-center sm:text-left" : ""
      }`}
    >
      <div className={`flex max-w-2xl flex-col gap-3 ${align === "center" ? "mx-auto items-center text-center sm:mx-0 sm:items-start sm:text-left" : ""}`}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="text-3xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-lg text-lg font-medium leading-7 text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="label-caps shrink-0 text-xs font-semibold text-foreground underline decoration-border-strong/40 decoration-1 underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {action.label} &nbsp;&#10230;
        </Link>
      )}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const base =
    "label-caps inline-flex items-center justify-center gap-2 border px-6 py-3.5 text-xs font-semibold transition-colors";
  const variants: Record<string, string> = {
    primary: "border-ink bg-ink text-surface hover:bg-transparent hover:text-ink",
    secondary: "border-ink bg-transparent text-ink hover:bg-ink hover:text-surface",
    ghost: "border-transparent px-0 py-1 text-ink underline decoration-1 underline-offset-4 hover:decoration-2",
  };

  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border bg-surface p-6 ${className}`}>
      {children}
    </div>
  );
}
