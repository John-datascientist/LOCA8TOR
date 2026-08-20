"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { NavLink } from "@/lib/nav";
import { Eyebrow } from "@/components/ui";

export function PortalShell({
  navItems,
  portalLabel,
  title,
  description,
  children,
}: {
  navItems: NavLink[];
  portalLabel: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="container-page grid min-w-0 gap-8 py-10 lg:grid-cols-[220px_1fr] lg:py-14">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <Eyebrow>{portalLabel}</Eyebrow>

        <select
          value={pathname}
          onChange={(e) => router.push(e.target.value)}
          className="label-caps mt-4 block w-full border border-border-strong bg-surface px-3 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-ink lg:hidden"
          aria-label={`${portalLabel} navigation`}
        >
          {navItems.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>

        <nav className="mt-4 hidden flex-col lg:flex lg:border-l lg:border-border">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`label-caps -ml-px border-l-2 px-3 py-2 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-foreground/60 hover:border-border-strong hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <h1 className="text-3xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
