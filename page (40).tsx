import { AuthCard } from "@/components/auth-card";
import { ButtonLink } from "@/components/ui";

export const metadata = { title: "Onboarding" };

const steps = [
  { title: "What brings you to WeGive?", detail: "Give items, find items, or both." },
  { title: "Add a saved location", detail: "Optional: Home, Work, School or Family, each with its own Loca8tor postcode." },
  { title: "Turn on notifications", detail: "Get notified about claims, deliveries and sponsorships." },
];

export default function OnboardingPage() {
  return (
    <AuthCard title="You're almost set up" description="A few quick steps to personalize WeGive for you." wide>
      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3 border border-border p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-ink text-xs font-semibold text-surface">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <ButtonLink href="/dashboard" variant="primary" className="mt-6 w-full">
        Go to my dashboard
      </ButtonLink>
    </AuthCard>
  );
}
