import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      updated="19 August 2026"
      intro="WeGive connects people and businesses giving away useful items with people who need them. This policy explains what we collect to make that work, how location data is handled through Loca8tor, and what stays private."
      sections={[
        {
          heading: "What we collect",
          body: (
            <>
              <p>
                Account details you give us directly: name, email, phone
                number, and your home postcode (entered manually or resolved
                via Loca8tor). For businesses, we also collect registration
                details and a representative contact.
              </p>
              <p>
                Activity data: giveaways you list or claim, messages sent
                through a claim or delivery thread, sponsorships you fund,
                and payment method (card or bank transfer). We don&apos;t
                store full card numbers ourselves; that&apos;s handled by our
                payment provider.
              </p>
            </>
          ),
        },
        {
          heading: "Location & Loca8tor",
          body: (
            <>
              <p>
                Distance, routing, live tracking and postcode resolution are
                provided by Loca8tor, a sibling product under Workerholics
                Solutions, through its API. WeGive never touches Loca8tor&apos;s
                underlying location database directly.
              </p>
              <p>
                Public listings show an approximate area and distance only.
                Your exact pickup or delivery address is revealed to the
                other party solely once a claim is confirmed and a delivery
                is being arranged.
              </p>
            </>
          ),
        },
        {
          heading: "Escrow & payments",
          body: (
            <p>
              When you pay for a delivery or sponsor someone else&apos;s, the
              amount is held in WeGive&apos;s escrow wallet, not paid out
              immediately. We record who paid, how (card or bank transfer),
              how much, and when it&apos;s released to a rider or refunded.
              This transaction history is visible to WeGive admins for
              dispute resolution, never sold or shared for marketing.
            </p>
          ),
        },
        {
          heading: "Who can see what",
          body: (
            <ul className="flex flex-col gap-2">
              <li>
                • A giver and recipient can message each other only after a
                claim exists.
              </li>
              <li>
                • A rider and recipient can message each other only during an
                active delivery.
              </li>
              <li>
                • Sponsors see the item, area and amount still needed, never
                the recipient&apos;s identity or exact address.
              </li>
              <li>
                • WeGive staff access personal data only to operate the
                platform, investigate reports, or respond to legal requests.
              </li>
            </ul>
          ),
        },
        {
          heading: "Data retention",
          body: (
            <p>
              We keep account and transaction records for as long as your
              account is active, plus a period afterward to satisfy tax,
              fraud-prevention and dispute-resolution obligations. You can
              request deletion of your account at any time, though some
              records tied to completed transactions may be retained where
              the law requires it.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              You can access, correct, or request deletion of your personal
              data, and you can withdraw consent for optional communications
              at any time. To exercise any of these, reach us at the contact
              below; we aim to respond within 5 business days.
            </p>
          ),
        },
        {
          heading: "Changes",
          body: (
            <p>
              If this policy changes materially, we&apos;ll notify active
              users in-app before the change takes effect. The date at the
              top of this page always reflects the version currently in
              force.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about your data or this policy? Reach the privacy
              team at{" "}
              <a href="mailto:privacy@wegive.app" className="font-semibold text-ink underline decoration-1 underline-offset-4">
                privacy@wegive.app
              </a>{" "}
              or use our{" "}
              <Link href="/contact" className="font-semibold text-ink underline decoration-1 underline-offset-4">
                contact form
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
