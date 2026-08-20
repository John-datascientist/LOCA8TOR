"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { countryList, COUNTRY_COOKIE, type CountryCode } from "@/lib/location";

export function CountrySwitcher({ current }: { current: CountryCode }) {
  const [value, setValue] = useState<CountryCode>(current);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="country" className="label-caps text-xs font-semibold text-foreground">
          Country
        </label>
        <select
          id="country"
          value={value}
          onChange={(e) => {
            setValue(e.target.value as CountryCode);
            setSaved(false);
          }}
          className="border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
        >
          {countryList.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.currencyCode})
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          document.cookie = `${COUNTRY_COOKIE}=${value}; path=/; max-age=31536000`;
          setSaved(true);
          startTransition(() => router.refresh());
        }}
        className="label-caps border border-ink bg-ink px-5 py-2.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60"
      >
        {isPending ? "Saving…" : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
