import { AuthCard, TextField } from "@/components/auth-card";

export const metadata = { title: "Verify your account" };

export default function VerifyPage() {
  return (
    <AuthCard
      title="Verify your account"
      description="Enter the 6-digit code we sent to your email and phone."
    >
      <form className="flex flex-col gap-4">
        <TextField id="code" label="Verification code" placeholder="000000" required />
        <button
          type="submit"
          className="label-caps border border-ink bg-ink px-5 py-3.5 text-xs font-semibold text-surface transition-colors hover:bg-transparent hover:text-ink"
        >
          Verify
        </button>
        <button
          type="button"
          className="label-caps text-xs font-semibold text-ink underline decoration-1 underline-offset-4"
        >
          Resend code
        </button>
      </form>
    </AuthCard>
  );
}
