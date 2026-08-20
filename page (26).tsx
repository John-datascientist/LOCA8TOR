"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCard, TextField } from "@/components/auth-card";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your email" description={undefined}>
        <div className="border border-border-strong bg-brand-light p-4 text-sm leading-6 text-ink">
          If an account exists for <span className="font-semibold">{email}</span>,
          we sent a link to reset your password.
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
      title="Reset your password"
      description="Enter the email on your account and we'll send you a reset link."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField id="email" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && (
          <p className="border border-warn bg-warn-light px-3 py-2.5 text-sm text-warn">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="label-caps border border-ink bg-ink px-5 py-3.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-ink underline decoration-1 underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
