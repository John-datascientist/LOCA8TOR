"use client";

import { useState } from "react";

export function ShareSponsorLink({ giveawayId }: { giveawayId: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/sponsor/${giveawayId}`;

  return (
    <div className="flex flex-col gap-2 border border-border bg-surface-muted p-4">
      <h3 className="text-sm font-semibold text-foreground">
        Need help with the delivery fee?
      </h3>
      <p className="text-xs leading-5 text-muted-foreground">
        Share this link: anyone can chip in to sponsor this delivery. It
        only gets charged once someone claims the item and the fee is
        calculated.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span className="flex-1 truncate border border-border-strong bg-surface px-3 py-2 font-mono text-xs text-muted-foreground">
          wegive.app{path}
        </span>
        <button
          type="button"
          onClick={() => {
            const url =
              typeof window !== "undefined"
                ? `${window.location.origin}${path}`
                : path;
            navigator.clipboard?.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          className="label-caps shrink-0 border border-ink bg-ink px-4 py-2 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
