import Link from "next/link";
import { Logo } from "@/components/logo";
import { footerNav } from "@/lib/nav";
import { getSelectedCountry } from "@/lib/location-server";

export async function SiteFooter() {
  const country = await getSelectedCountry();

  return (
    <footer className="border-t border-border-strong bg-background">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            A social distribution network for unused resources, connecting
            people and businesses who have things to give with people who
            need them, backed by real delivery infrastructure.
          </p>
        </div>

        {footerNav.map((group) => (
          <div key={group.heading}>
            <h3 className="label-caps text-xs font-semibold text-foreground">
              {group.heading}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-page label-caps flex flex-col gap-3 py-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} WeGive, a Workerholics Solutions company</p>
          {country === "NG" && (
            <p className="flex items-center gap-1.5">
              Location &amp; delivery tracking powered by
              <span className="font-semibold text-foreground">Loca8tor</span>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
