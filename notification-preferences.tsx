"use client";

import { useState } from "react";

type Pref = { inApp: boolean; email: boolean };

const notificationTypes = [
  { key: "newListing", label: "New listings near you", hint: "When someone posts an item matching your interests" },
  { key: "claims", label: "Claims on your giveaways", hint: "When someone claims something you're giving away" },
  { key: "deliveries", label: "Delivery updates", hint: "Pickup, tracking and drop-off confirmations" },
  { key: "sponsorships", label: "Sponsorships", hint: "When a delivery you sponsored is funded or completed" },
] as const;

const defaults: Record<(typeof notificationTypes)[number]["key"], Pref> = {
  newListing: { inApp: true, email: true },
  claims: { inApp: true, email: true },
  deliveries: { inApp: true, email: false },
  sponsorships: { inApp: true, email: false },
};

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState(defaults);

  function toggle(key: keyof typeof prefs, channel: keyof Pref) {
    setPrefs((p) => ({ ...p, [key]: { ...p[key], [channel]: !p[key][channel] } }));
  }

  return (
    <div className="flex flex-col divide-y divide-border border-t border-border">
      <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 py-2 text-right">
        <span />
        <span className="label-caps text-[11px] font-semibold text-muted-foreground">In-app</span>
        <span className="label-caps text-[11px] font-semibold text-muted-foreground">Email</span>
      </div>
      {notificationTypes.map((t) => (
        <div key={t.key} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t.label}</p>
            <p className="text-xs text-muted-foreground">{t.hint}</p>
          </div>
          <div className="text-right">
            <input
              type="checkbox"
              checked={prefs[t.key].inApp}
              onChange={() => toggle(t.key, "inApp")}
              className="h-4 w-4 border-border-strong text-ink focus:ring-ink"
              aria-label={`${t.label}, in-app`}
            />
          </div>
          <div className="text-right">
            <input
              type="checkbox"
              checked={prefs[t.key].email}
              onChange={() => toggle(t.key, "email")}
              className="h-4 w-4 border-border-strong text-ink focus:ring-ink"
              aria-label={`${t.label}, email`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
