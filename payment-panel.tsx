"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui";
import { TextField } from "@/components/auth-card";
import { type PaymentMethod } from "@/lib/mock-data";
import { countries, formatCurrency, type CountryCode } from "@/lib/location";

export function PaymentPanel({
  amount,
  actionLabel,
  continueHref,
  continueLabel,
  country = "NG",
}: {
  amount: number;
  actionLabel: string;
  continueHref: string;
  continueLabel: string;
  country?: CountryCode;
}) {
  const [method, setMethod] = useState<PaymentMethod>("Card");
  const [status, setStatus] = useState<"idle" | "processing" | "held">("idle");
  const bank = countries[country].escrowBank;
  // Bank transfer is only wired up for Nigeria. Everywhere else pays by
  // card via Stripe.
  const availableMethods: PaymentMethod[] = country === "NG" ? ["Card", "Bank transfer"] : ["Card"];

  if (status === "held") {
    return (
      <div className="border border-border-strong bg-brand-light/60 p-6 text-center">
        <p className="text-3xl">🔒</p>
        <p className="mt-3 text-sm font-semibold text-ink">
          {formatCurrency(amount, country)} held in escrow
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid via {method.toLowerCase()}. WeGive holds this in the escrow
          wallet and releases it to the rider only once delivery is
          confirmed.
        </p>
        <ButtonLink href={continueHref} variant="primary" className="mt-5 w-full">
          {continueLabel}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 border border-border bg-surface-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
        <span aria-hidden="true">🔒</span>
        <span>
          Payments are held in WeGive&apos;s escrow wallet and only released
          to the rider once delivery is confirmed, never paid out upfront.
        </span>
      </div>

      {availableMethods.length > 1 ? (
        <div className="flex border border-border-strong">
          {availableMethods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`label-caps flex-1 px-4 py-3 text-xs font-semibold transition-colors ${
                method === m
                  ? "bg-ink text-surface"
                  : "bg-surface text-foreground hover:bg-surface-muted"
              }`}
            >
              {m === "Card" ? "Card payment" : "Bank transfer"}
            </button>
          ))}
        </div>
      ) : (
        <p className="label-caps border border-border-strong bg-surface px-4 py-3 text-center text-xs font-semibold text-foreground">
          Card payment via Stripe
        </p>
      )}

      {method === "Card" ? (
        <div className="flex flex-col gap-3">
          <TextField id="cardNumber" label="Card number" placeholder="4242 4242 4242 4242" required />
          <div className="grid grid-cols-2 gap-3">
            <TextField id="cardExpiry" label="Expiry" placeholder="MM/YY" required />
            <TextField id="cardCvv" label="CVV" placeholder="123" required />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border border-border bg-surface-muted px-4 py-3.5 text-sm">
          <p className="text-foreground">
            Transfer <span className="font-semibold">{formatCurrency(amount, country)}</span> to the
            WeGive escrow account below. It&apos;s released automatically once
            we confirm receipt.
          </p>
          <div className="mt-1 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
            <span>Bank: {bank.bank}</span>
            <span>Account name: {bank.accountName}</span>
            <span>{bank.accountLabel}: {bank.accountNumber}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={status === "processing"}
        onClick={() => {
          setStatus("processing");
          setTimeout(() => setStatus("held"), 900);
        }}
        className="label-caps border border-ink bg-ink px-5 py-3.5 text-center text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60"
      >
        {status === "processing"
          ? "Processing…"
          : `${actionLabel} ${formatCurrency(amount, country)} securely`}
      </button>
    </div>
  );
}
