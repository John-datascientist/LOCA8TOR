"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Eyebrow, ButtonLink } from "@/components/ui";
import { BackButton } from "@/components/back-button";
import { TextField } from "@/components/auth-card";
import { AddressFields, type ProfileAddress } from "@/components/address-fields";
import { categories, subcategories, type Category } from "@/lib/categories";
import type { CountryCode } from "@/lib/location";
import { createClient } from "@/lib/supabase/client";

const categoryFields: Record<Category, string[]> = {
  Furniture: ["Dimensions", "Weight / estimated weight", "Pickup requirements"],
  Electronics: ["Brand", "Model", "Working / not working"],
  Food: ["Quantity", "Packaged or cooked", "Best-before / expiry", "Storage requirements", "Ingredients / allergens"],
  Clothing: ["Size", "Brand", "Fabric / material"],
  Household: ["Material", "Set size / quantity", "Dishwasher safe"],
};

const MAX_PHOTOS = 6;

export function CreateGiveawayForm({ country }: { country: CountryCode }) {
  const [category, setCategory] = useState<Category>("Furniture");
  const [subcategory, setSubcategory] = useState<string>(subcategories.Furniture[0]);
  const [coversDelivery, setCoversDelivery] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [profileAddress, setProfileAddress] = useState<ProfileAddress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photoPreviews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);

  useEffect(() => {
    return () => photoPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [photoPreviews]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
      if (meta?.address_line1 && meta?.city && meta?.region && meta?.postcode) {
        setProfileAddress({
          line1: meta.address_line1,
          line2: meta.address_line2,
          city: meta.city,
          region: meta.region,
          postcode: meta.postcode,
        });
      }
    });
  }, []);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setPhotos((prev) => {
      const combined = [...prev, ...selected].slice(0, MAX_PHOTOS);
      return combined;
    });
    setPhotoError(null);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  if (submitted) {
    return (
      <div className="container-page flex justify-center py-14 sm:py-20">
        <Card className="w-full max-w-lg border-border-strong bg-brand-light/60 text-center">
          <p className="text-3xl">📬</p>
          <h1 className="mt-3 text-2xl font-black uppercase tracking-tight text-ink">
            Submitted for review
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink/80">
            Once approved, your listing goes live and nearby members who
            match this category are notified right away, by in-app
            notification and email.
          </p>
          <ButtonLink href="/my-giveaways" variant="primary" className="mt-6 w-full">
            Go to my giveaways
          </ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page flex flex-col gap-8 py-14 sm:py-20">
      <BackButton />
      <div className="flex max-w-2xl flex-col gap-4">
        <Eyebrow>New giveaway</Eyebrow>
        <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          What are you giving away?
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          The form adjusts to your category, so you only see the fields that
          matter for this item.
        </p>
      </div>

      <Card className="max-w-2xl">
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (photos.length === 0) {
              setPhotoError("Add at least 1 photo of the item.");
              return;
            }
            setSubmitted(true);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="label-caps text-xs font-semibold text-foreground">Category</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setSubcategory(subcategories[c][0]);
                  }}
                  className={`label-caps border px-4 py-1.5 text-xs font-semibold transition-colors ${
                    category === c
                      ? "border-ink bg-ink text-surface"
                      : "border-border-strong bg-surface text-foreground/70 hover:bg-surface-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="label-caps text-xs font-semibold text-foreground">
              {category} type
            </span>
            <div className="flex flex-wrap gap-2">
              {subcategories[category].map((sub) => (
                <button
                  type="button"
                  key={sub}
                  onClick={() => setSubcategory(sub)}
                  className={`label-caps border px-4 py-1.5 text-xs font-semibold transition-colors ${
                    subcategory === sub
                      ? "border-ink bg-ink text-surface"
                      : "border-border-strong bg-surface text-foreground/70 hover:bg-surface-muted"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          <TextField id="item-name" label="Item name" required />
          <TextField id="condition" label="Condition" required />

          <div className="grid gap-4 sm:grid-cols-2">
            {categoryFields[category].map((field) => (
              <TextField key={field} id={field} label={field} />
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="label-caps text-xs font-semibold text-foreground">
              Photos <span className="text-accent-dark">*</span>{" "}
              <span className="font-normal normal-case text-muted-foreground">
                ({photos.length}/{MAX_PHOTOS})
              </span>
            </span>

            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {photoPreviews.map((src, i) => (
                  <div key={src} className="group relative aspect-square overflow-hidden border border-border-strong">
                    {/* eslint-disable-next-line @next/next/no-img-element -- client-side blob: preview, not an optimizable remote image */}
                    <img src={src} alt={`Item photo ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center bg-ink text-xs font-bold text-surface opacity-90 hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex h-28 items-center justify-center border border-dashed text-sm text-muted-foreground transition-colors hover:bg-surface-muted ${
                  photoError ? "border-warn" : "border-border-strong"
                }`}
              >
                Click to upload photos (up to {MAX_PHOTOS})
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            {photoError ? (
              <p className="text-xs text-warn">{photoError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                At least 1 photo is required, up to {MAX_PHOTOS}.
              </p>
            )}
          </div>

          <AddressFields
            country={country}
            idPrefix="return"
            heading="Your address (for returns)"
            helperText="If a delivery can't be completed, this is where the item gets sent back. It's never shown on your public listing."
            profileAddress={profileAddress}
          />

          <div className="flex flex-col gap-2 border border-border bg-surface-muted p-4">
            <span className="label-caps text-xs font-semibold text-foreground">
              Delivery
            </span>
            <p className="text-sm text-muted-foreground">
              Would you like to cover the delivery fee for whoever claims
              this?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCoversDelivery(true)}
                className={`label-caps flex-1 border px-4 py-2.5 text-xs font-semibold transition-colors ${
                  coversDelivery === true
                    ? "border-ink bg-ink text-surface"
                    : "border-border-strong bg-surface text-foreground/70 hover:bg-surface-muted"
                }`}
              >
                Yes, I&apos;ll cover it
              </button>
              <button
                type="button"
                onClick={() => setCoversDelivery(false)}
                className={`label-caps flex-1 border px-4 py-2.5 text-xs font-semibold transition-colors ${
                  coversDelivery === false
                    ? "border-ink bg-ink text-surface"
                    : "border-border-strong bg-surface text-foreground/70 hover:bg-surface-muted"
                }`}
              >
                No, recipient pays
              </button>
            </div>
            {coversDelivery === true && (
              <p className="text-xs leading-5 text-muted-foreground">
                You won&apos;t be charged now. Once someone claims this item
                and the delivery fee is calculated from the distance to
                them, we&apos;ll ask you to pay then, and the listing shows
                as &ldquo;Free delivery&rdquo; in the meantime.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="label-caps mt-2 self-start border border-ink bg-ink px-5 py-3.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink"
          >
            Submit for review
          </button>
          <p className="text-xs text-muted-foreground">
            Your listing goes to PENDING_REVIEW. Once approved, it appears
            publicly and nearby members are notified by in-app and email
            notification.
          </p>
        </form>
      </Card>
    </div>
  );
}
