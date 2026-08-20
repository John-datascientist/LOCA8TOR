"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard, TextField } from "@/components/auth-card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(searchParams.get("next") ?? "/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title="Log in to WeGive" description="Welcome back.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField id="email" label="Email" type="email" required />
        <TextField id="password" label="Password" type="password" required />
        {error && (
          <p className="border border-warn bg-warn-light px-3 py-2.5 text-sm text-warn">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-ink underline decoration-1 underline-offset-4">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="label-caps border border-ink bg-ink px-5 py-3.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to WeGive?{" "}
        <Link href="/signup" className="font-semibold text-ink underline decoration-1 underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
