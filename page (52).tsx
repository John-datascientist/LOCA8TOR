"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard, TextField } from "@/components/auth-card";
import { countries, countryList, isValidPostcode, COUNTRY_COOKIE, type CountryCode } from "@/lib/location";
import { createClient } from "@/lib/supabase/client";
import { getCurrentCoordinates, resolvePostcodeFromCoordinates } from "@/lib/loca8tor-client";

type Step = "account" | "location";
type PostcodeMode = "choose" | "manual" | "generating" | "generated";

const generationSteps = [
  "Requesting location permission…",
  "Reading GPS coordinates…",
  "Resolving your postcode…",
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState<CountryCode>("NG");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [mode, setMode] = useState<PostcodeMode>("choose");
  const [generationStep, setGenerationStep] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const [postcode, setPostcode] = useState("");
  const [manualPostcode, setManualPostcode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const config = countries[country];
  const manualIsValid = manualPostcode.length > 0 && isValidPostcode(manualPostcode, country);
  const addressIsValid = addressLine1.trim().length > 0 && city.trim().length > 0 && region.trim().length > 0;

  function startGenerating() {
    setGenError(null);
    setMode("generating");
    setGenerationStep(0);

    if (country !== "NG") {
      // Loca8tor only covers Nigeria today. Everywhere else keeps the
      // simulated flow until a real provider is wired up for that market.
      let i = 0;
      const interval = setInterval(() => {
        i += 1;
        if (i >= generationSteps.length) {
          clearInterval(interval);
          setPostcode(config.generatePostcode());
          setMode("generated");
        } else {
          setGenerationStep(i);
        }
      }, 700);
      return;
    }

    generateFromLoca8tor();
  }

  async function generateFromLoca8tor() {
    try {
      const { latitude, longitude } = await getCurrentCoordinates();
      // Skip straight to "resolving" once we have coordinates, there's no
      // separate step for a real GPS read.
      setGenerationStep(2);
      const resolvedPostcode = await resolvePostcodeFromCoordinates(latitude, longitude);
      setPostcode(resolvedPostcode);
      setMode("generated");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Couldn't generate your postcode.");
      setMode("choose");
    }
  }

  async function completeSignup() {
    setError(null);
    setSubmitting(true);

    const finalPostcode = mode === "generated" ? postcode : manualPostcode;
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: {
          full_name: fullName,
          phone,
          country,
          postcode: finalPostcode,
          address_line1: addressLine1,
          address_line2: addressLine2,
          city,
          region,
        },
      },
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    document.cookie = `${COUNTRY_COOKIE}=${country}; path=/; max-age=31536000`;

    if (!data.session) {
      setCheckEmail(true);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <AuthCard title="Check your email" description={undefined}>
        <div className="border border-border-strong bg-brand-light p-4 text-sm leading-6 text-ink">
          We sent a confirmation link to <span className="font-semibold">{email}</span>.
          Follow it to activate your account, then log in.
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-semibold text-ink underline decoration-1 underline-offset-4">
            Back to log in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={step === "account" ? "Create your WeGive account" : "Set your home location"}
      description={
        step === "account"
          ? "Give and get in your community, it only takes a minute."
          : undefined
      }
      wide
    >
      <div className="label-caps mb-6 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
        <span className={step === "account" ? "text-ink" : ""}>1. Account</span>
        <span className="h-px flex-1 bg-border" />
        <span className={step === "location" ? "text-ink" : ""}>2. Home location</span>
      </div>

      {step === "account" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setStep("location");
          }}
        >
          <TextField id="fullName" label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField id="email" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField id="phone" label="Phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField id="password" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="country" className="label-caps text-xs font-semibold text-foreground">
              Country <span className="text-accent-dark">*</span>
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value as CountryCode)}
              className="border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
            >
              {countryList.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.currencyCode})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Sets your currency and postcode format across WeGive.
            </p>
          </div>
          <button
            type="submit"
            className="label-caps mt-2 border border-ink bg-ink px-5 py-3.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink"
          >
            Continue
          </button>
        </form>
      )}

      {step === "location" && (
        <div className="flex flex-col gap-5">
          <div className="border border-border-strong bg-brand-light p-4 text-sm text-ink">
            <p className="font-semibold">📍 Important: Use your HOME {config.postcodeLabel.toLowerCase()}.</p>
            <p className="mt-1 leading-6">
              Your home {config.postcodeLabel.toLowerCase()} will be used as your
              default delivery location when you receive items through
              WeGive.
            </p>
          </div>

          <div className="flex flex-col gap-3 border border-border bg-surface-muted p-4">
            <span className="label-caps text-xs font-semibold text-foreground">Home address</span>
            <TextField
              id="addressLine1"
              label="House / apartment number & street name"
              placeholder="e.g. 12 Allen Avenue"
              required
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
            <TextField
              id="addressLine2"
              label="Apartment / unit (optional)"
              placeholder="e.g. Flat 3B"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField id="city" label="City" required value={city} onChange={(e) => setCity(e.target.value)} />
              <TextField
                id="region"
                label={config.regionLabel}
                placeholder={config.regionPlaceholder}
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Country: {config.name}</p>
          </div>

          {mode === "choose" && (
            <div className="flex flex-col gap-3">
              {genError && (
                <p className="border border-warn bg-warn-light px-3 py-2.5 text-sm text-warn">
                  {genError}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className="label-caps flex-1 border border-ink px-4 py-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                >
                  Enter Existing {config.postcodeLabel}
                </button>
                <button
                  type="button"
                  onClick={startGenerating}
                  className="label-caps flex-1 border border-ink bg-ink px-4 py-3.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink"
                >
                  Generate My {config.postcodeLabel}
                </button>
              </div>
            </div>
          )}

          {mode === "manual" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="postcode" className="label-caps text-xs font-semibold text-foreground">
                  {config.postcodeLabel} <span className="text-accent-dark">*</span>
                </label>
                <input
                  id="postcode"
                  name="postcode"
                  value={manualPostcode}
                  onChange={(e) => setManualPostcode(e.target.value)}
                  placeholder={config.postcodePlaceholder}
                  className={`border bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink ${
                    manualPostcode.length > 0 && !manualIsValid
                      ? "border-warn"
                      : "border-border-strong"
                  }`}
                />
                {manualPostcode.length > 0 && !manualIsValid && (
                  <p className="text-xs text-warn">
                    Doesn&apos;t look like a valid {config.name} {config.postcodeLabel.toLowerCase()} ({config.postcodePlaceholder}).
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="label-caps self-start text-xs font-semibold text-ink underline decoration-1 underline-offset-4"
              >
                ← Generate it for me instead
              </button>
            </div>
          )}

          {mode === "generating" && (
            <div className="flex flex-col items-center gap-3 border border-border py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                {generationSteps[generationStep]}
              </p>
            </div>
          )}

          {mode === "generated" && (
            <div className="flex flex-col items-center gap-3 border border-border-strong bg-brand-light/60 py-8">
              <p className="label-caps text-xs font-semibold text-ink">
                Your {config.postcodeLabel.toLowerCase()}
              </p>
              <p className="text-2xl font-black tracking-tight text-ink">
                {postcode}
              </p>
            </div>
          )}

          {((mode === "manual" && manualIsValid) || mode === "generated") && (
            <>
              <label className="flex items-start gap-2.5 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 border-border-strong text-ink focus:ring-ink"
                />
                I confirm this is my home/current delivery location.
              </label>
              {error && (
                <p className="border border-warn bg-warn-light px-3 py-2.5 text-sm text-warn">
                  {error}
                </p>
              )}
              {!addressIsValid && (
                <p className="text-xs text-warn">
                  Fill in your home address above before creating your account.
                </p>
              )}
              <button
                type="button"
                disabled={!confirmed || !addressIsValid || submitting}
                onClick={completeSignup}
                className={`label-caps border px-5 py-3.5 text-center text-xs font-semibold transition-colors ${
                  confirmed && addressIsValid
                    ? "border-ink bg-ink text-surface hover:bg-transparent hover:text-ink disabled:opacity-60"
                    : "pointer-events-none border-border bg-surface-muted text-muted-foreground"
                }`}
              >
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline decoration-1 underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
