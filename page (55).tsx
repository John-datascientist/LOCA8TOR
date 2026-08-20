import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of service"
      updated="19 August 2026"
      intro="These terms cover giving, claiming, delivering and sponsoring items through WeGive. By creating an account, you agree to them."
      sections={[
        {
          heading: "Your account",
          body: (
            <p>
              You must be at least 18 to create a WeGive account, and the
              details you provide (name, contact info, home postcode) must
              be accurate. Businesses go through a separate verification
              flow before they can list bulk giveaways or fund a corporate
              giving balance.
            </p>
          ),
        },
        {
          heading: "Listing an item",
          body: (
            <>
              <p>
                Every giveaway moves through the same lifecycle: DRAFT →
                PENDING_REVIEW → APPROVED → AVAILABLE → RESERVED → CLAIMED →
                DELIVERY_PENDING → DELIVERED → COMPLETED. Listings go through
                review before they&apos;re publicly visible.
              </p>
              <p>
                You&apos;re responsible for describing the item&apos;s
                condition accurately. At listing time, you choose whether
                you&apos;ll cover the delivery fee for whoever claims it;
                that commitment isn&apos;t charged until a claim exists and
                the fee is calculated.
              </p>
            </>
          ),
        },
        {
          heading: "Claiming an item",
          body: (
            <p>
              Claiming reserves an item for a limited time (30 minutes by
              default) while delivery is arranged. If a delivery isn&apos;t
              requested and funded before the reservation expires, the item
              returns to Available for someone else to claim. Some giveaways
              require a verified recipient before they can be claimed.
            </p>
          ),
        },
        {
          heading: "Fees, escrow & sponsorship",
          body: (
            <>
              <p>
                Delivery fees are calculated server-side from distance, plus
                VAT and a WeGive administration fee, never estimated or
                trusted from the browser. Whatever you pay, whether by card
                or bank transfer, is held in WeGive&apos;s escrow wallet and
                released to the rider only once delivery is confirmed.
              </p>
              <p>
                Anyone can sponsor part or all of a delivery&apos;s fee
                through a shared link. Sponsorship contributions are also
                held in escrow and are non-refundable once a delivery is
                confirmed complete, except where WeGive determines a refund
                is warranted.
              </p>
            </>
          ),
        },
        {
          heading: "Delivery & riders",
          body: (
            <p>
              Deliveries are carried out by verified riders assigned through
              Loca8tor. Exact pickup and delivery addresses are shared with
              the relevant parties only once a delivery is confirmed. Rider
              and recipient can message each other only while a delivery is
              active.
            </p>
          ),
        },
        {
          heading: "Prohibited conduct",
          body: (
            <ul className="flex flex-col gap-2">
              <li>• Listing items you don&apos;t own or can&apos;t legally give away</li>
              <li>• Listing prohibited, hazardous, or counterfeit items</li>
              <li>• Misrepresenting an item&apos;s condition to secure a claim</li>
              <li>• Attempting to circumvent escrow by arranging payment outside WeGive</li>
              <li>• Harassing another user in claim or delivery messaging</li>
            </ul>
          ),
        },
        {
          heading: "Suspension & disputes",
          body: (
            <p>
              We may suspend or remove a listing or account that violates
              these terms, pending review. If you disagree with a decision
              (a removed listing, a withheld sponsorship, a delivery dispute),
              contact us and we&apos;ll review it. Every admin action affecting
              your account is logged with who, what, when, and why.
            </p>
          ),
        },
        {
          heading: "Changes to these terms",
          body: (
            <p>
              We may update these terms as the platform evolves. Material
              changes are announced in-app before they take effect; the date
              at the top of this page reflects the version currently in
              force.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about these terms? Reach us at{" "}
              <a href="mailto:legal@wegive.app" className="font-semibold text-ink underline decoration-1 underline-offset-4">
                legal@wegive.app
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
