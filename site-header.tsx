"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Logo } from "@/components/logo";
import { primaryNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import type { CountryCode } from "@/lib/location";

export function SiteHeader({ user, country }: { user: User | null; country: CountryCode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || "Account";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    setAccountOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur">
      <div className="hidden border-b border-border sm:block">
        <div className="container-page label-caps flex h-9 items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>Community giving network</span>
          <span>Est. 2026</span>
          {country === "NG" && <span>Powered by Loca8tor</span>}
        </div>
      </div>

      <div className="border-b border-border-strong">
        <div className="container-page flex h-16 items-center justify-between sm:h-20">
          <Logo />

          <nav className="hidden items-center gap-8 lg:flex">
            {primaryNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="label-caps text-xs font-semibold text-ink/80 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="label-caps flex items-center gap-2 text-xs font-semibold text-ink/80 transition-colors hover:text-ink"
                  aria-expanded={accountOpen}
                >
                  <span className="flex h-8 w-8 items-center justify-center border border-ink text-[11px] font-black uppercase">
                    {displayName.charAt(0)}
                  </span>
                  {displayName}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 border border-border-strong bg-surface py-1 shadow-lg">
                    <Link
                      href="/profile"
                      onClick={() => setAccountOpen(false)}
                      className="label-caps block px-4 py-2.5 text-xs font-semibold text-ink/80 hover:bg-surface-muted hover:text-ink"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setAccountOpen(false)}
                      className="label-caps block px-4 py-2.5 text-xs font-semibold text-ink/80 hover:bg-surface-muted hover:text-ink"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="label-caps block w-full px-4 py-2.5 text-left text-xs font-semibold text-warn hover:bg-surface-muted"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="label-caps text-xs font-semibold text-ink/80 transition-colors hover:text-ink"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="label-caps border border-ink bg-ink px-5 py-2.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center border border-border-strong lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <span className="sr-only">Toggle menu</span>
            <div className="flex flex-col gap-1.5">
              <span className="h-0.5 w-5 bg-ink" />
              <span className="h-0.5 w-5 bg-ink" />
              <span className="h-0.5 w-5 bg-ink" />
            </div>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-b border-border-strong bg-surface lg:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {primaryNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="label-caps px-2 py-2.5 text-xs font-semibold text-ink/80 hover:bg-surface-muted hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="label-caps px-2 py-2.5 text-xs font-semibold text-ink/80 hover:bg-surface-muted"
                  >
                    Profile ({displayName})
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="label-caps px-2 py-2.5 text-xs font-semibold text-ink/80 hover:bg-surface-muted"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="label-caps px-2 py-2.5 text-left text-xs font-semibold text-warn hover:bg-surface-muted"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="label-caps px-2 py-2.5 text-xs font-semibold text-ink/80 hover:bg-surface-muted"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="label-caps border border-ink bg-ink px-4 py-2.5 text-center text-xs font-semibold text-surface"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
