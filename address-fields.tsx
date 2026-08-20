"use client";

import { useState } from "react";
import { TextField } from "@/components/auth-card";
import { countries, type CountryCode } from "@/lib/location";
import { resolvePostcodeFromLocation } from "@/lib/loca8tor-client";

export type ProfileAddress = {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postcode: string;
};

export function AddressFields({
  country,
  idPrefix,
  heading,
  helperText,
  profileAddress,
}: {
  country: CountryCode;
  idPrefix: string;
  heading: string;
  helperText?: string;
  /** When provided, shows a "use my profile address" toggle pre-filled from it. */
  profileAddress?: ProfileAddress | null;
}) {
  const config = countries[country];
  const postcodeLabel = country === "NG" ? "Postcode" : config.postcodeLabel;
  const [useProfileAddress, setUseProfileAddress] = useState(!!profileAddress);
  const [postcode, setPostcode] = useState(profileAddress?.postcode ?? "");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  async function handleUseCurrentLocation() {
    setLocateError(null);
    setLocating(true);
    try {
      setPostcode(await resolvePostcodeFromLocation());
    } catch (err) {
      setLocateError(err instanceof Error ? err.message : "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border border-border bg-surface-muted p-4">
      <div>
        <span className="label-caps text-xs font-semibold text-foreground">{heading}</span>
        {helperText && <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>}
      </div>

      {profileAddress && (
        <label className="flex items-center gap-2.5 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={useProfileAddress}
            onChange={(e) => setUseProfileAddress(e.target.checked)}
            className="h-4 w-4 border-border-strong text-ink focus:ring-ink"
          />
          Use my profile address
        </label>
      )}

      {useProfileAddress && profileAddress ? (
        <div className="border border-border-strong bg-surface p-3 text-sm text-foreground">
          <p>{profileAddress.line1}{profileAddress.line2 ? `, ${profileAddress.line2}` : ""}</p>
          <p>{profileAddress.city}, {profileAddress.region} {profileAddress.postcode}</p>
          <p>{config.name}</p>
        </div>
      ) : (
        <>
          <TextField
            id={`${idPrefix}-line1`}
            label="Address line 1"
            placeholder="Street address"
            required
            defaultValue={profileAddress?.line1}
          />
          <TextField
            id={`${idPrefix}-line2`}
            label="Address line 2 (optional)"
            placeholder="Apartment, suite, unit"
            defaultValue={profileAddress?.line2}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id={`${idPrefix}-city`}
              label="City / Town"
              required
              defaultValue={profileAddress?.city}
            />
            <TextField
              id={`${idPrefix}-region`}
              label={config.regionLabel}
              placeholder={config.regionPlaceholder}
              required
              defaultValue={profileAddress?.region}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`${idPrefix}-postcode`} className="label-caps text-xs font-semibold text-foreground">
                {postcodeLabel} <span className="text-accent-dark">*</span>
              </label>
              {country === "NG" && (
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="label-caps text-[11px] font-semibold text-ink underline decoration-1 underline-offset-4 disabled:opacity-60"
                >
                  {locating ? "Locating…" : "Use my current location"}
                </button>
              )}
            </div>
            <input
              id={`${idPrefix}-postcode`}
              name={`${idPrefix}-postcode`}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder={config.postcodePlaceholder}
              className="border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
            {locateError && <p className="text-xs text-warn">{locateError}</p>}
          </div>
          <p className="text-xs text-muted-foreground">Country: {config.name}</p>
        </>
      )}
    </div>
  );
}
