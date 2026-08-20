"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/auth-card";
import { countries, isValidPostcode, type CountryCode } from "@/lib/location";
import { createClient } from "@/lib/supabase/client";
import { resolvePostcodeFromLocation } from "@/lib/loca8tor-client";

export function EditAddressForm({
  country,
  initialPostcode,
  initialLine1,
  initialLine2,
  initialCity,
  initialRegion,
}: {
  country: CountryCode;
  initialPostcode: string;
  initialLine1: string;
  initialLine2: string;
  initialCity: string;
  initialRegion: string;
}) {
  const router = useRouter();
  const config = countries[country];
  const [editing, setEditing] = useState(false);
  const [postcode, setPostcode] = useState(initialPostcode);
  const [line1, setLine1] = useState(initialLine1);
  const [line2, setLine2] = useState(initialLine2);
  const [city, setCity] = useState(initialCity);
  const [region, setRegion] = useState(initialRegion);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [postcodeFromApi, setPostcodeFromApi] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // A postcode Loca8tor just resolved is trusted as-is, no need to
  // re-check it against our own (approximate) format pattern.
  const postcodeIsValid = postcodeFromApi || (postcode.length > 0 && isValidPostcode(postcode, country));
  const canSave = postcodeIsValid && line1.trim().length > 0 && city.trim().length > 0 && region.trim().length > 0;

  async function handleUseCurrentLocation() {
    setLocateError(null);
    setLocating(true);
    try {
      const resolved = await resolvePostcodeFromLocation();
      setPostcode(resolved);
      setPostcodeFromApi(true);
    } catch (err) {
      setLocateError(err instanceof Error ? err.message : "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        postcode,
        address_line1: line1,
        address_line2: line2,
        city,
        region,
      },
    });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setEditing(false);
    setSaved(true);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="sm:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Home postcode
            </p>
            <p className="mt-1 text-sm text-foreground">{initialPostcode || "Not set"}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Home address
            </p>
            {initialLine1 ? (
              <p className="mt-1 text-sm text-foreground">
                {initialLine1}
                {initialLine2 ? `, ${initialLine2}` : ""}
                <br />
                {initialCity}, {initialRegion}
              </p>
            ) : (
              <p className="mt-1 text-sm text-foreground">Not set</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setEditing(true);
            }}
            className="label-caps shrink-0 text-xs font-semibold text-ink underline decoration-1 underline-offset-4"
          >
            Edit
          </button>
        </div>
        {saved && (
          <p className="mt-3 border border-border-strong bg-brand-light/60 px-3 py-2 text-xs text-ink">
            Saved.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border border-border bg-surface-muted p-4 sm:col-span-2">
      <span className="label-caps text-xs font-semibold text-foreground">Edit home postcode & address</span>
      <TextField
        id="edit-line1"
        label="Address line 1"
        placeholder="Street address"
        required
        value={line1}
        onChange={(e) => setLine1(e.target.value)}
      />
      <TextField
        id="edit-line2"
        label="Address line 2 (optional)"
        placeholder="Apartment, suite, unit"
        value={line2}
        onChange={(e) => setLine2(e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="edit-city" label="City / Town" required value={city} onChange={(e) => setCity(e.target.value)} />
        <TextField
          id="edit-region"
          label={config.regionLabel}
          placeholder={config.regionPlaceholder}
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="edit-postcode" className="label-caps text-xs font-semibold text-foreground">
            {config.postcodeLabel} <span className="text-accent-dark">*</span>
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
          id="edit-postcode"
          value={postcode}
          onChange={(e) => {
            setPostcode(e.target.value);
            setPostcodeFromApi(false);
          }}
          placeholder={config.postcodePlaceholder}
          className={`border bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink ${
            postcode.length > 0 && !postcodeIsValid ? "border-warn" : "border-border-strong"
          }`}
        />
        {postcode.length > 0 && !postcodeIsValid && (
          <p className="text-xs text-warn">
            Doesn&apos;t look like a valid {config.name} {config.postcodeLabel.toLowerCase()} ({config.postcodePlaceholder}).
          </p>
        )}
        {locateError && <p className="text-xs text-warn">{locateError}</p>}
      </div>
      {error && (
        <p className="border border-warn bg-warn-light px-3 py-2.5 text-sm text-warn">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!canSave || submitting}
          onClick={handleSave}
          className="label-caps border border-ink bg-ink px-5 py-2.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => {
            setLine1(initialLine1);
            setLine2(initialLine2);
            setCity(initialCity);
            setRegion(initialRegion);
            setPostcode(initialPostcode);
            setPostcodeFromApi(false);
            setLocateError(null);
            setError(null);
            setEditing(false);
          }}
          className="label-caps px-5 py-2.5 text-xs font-semibold text-foreground/70 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
