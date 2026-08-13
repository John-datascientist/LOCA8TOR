import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { ArrowLeft } from 'lucide-react';
import logoImg from '@/assets/loca8tor-logo-green.png';

export default function Terms({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className={embedded ? '' : 'min-h-screen bg-background'}>
      {!embedded && <SEO title="Terms & Conditions — Loca8tor" description="Read the terms and conditions for using Loca8tor postcode generation and delivery services." path="/terms" />}
      <div className={embedded ? 'max-w-3xl mx-auto px-5 py-6' : 'max-w-3xl mx-auto px-5 py-12'}>
        {!embedded && (
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        )}

        <div className="flex items-center gap-3 mb-8">
          {!embedded && <img src={logoImg} alt="Loca8tor" className="w-10 h-10 rounded-lg object-cover" />}
          <h1 className={embedded ? 'font-heading text-2xl font-extrabold' : 'font-heading text-3xl font-extrabold'}>Terms & Conditions</h1>
        </div>

        <p className="text-xs text-muted-foreground mb-8">Last updated: April 14, 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using the Loca8tor platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you may not use the Service. These terms apply to all users, including riders, businesses, and visitors.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">2. Description of Service</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Loca8tor provides a postcode and location code generation system, delivery tracking tools, rider management features, and related services. The Service is available in Nigeria, the United Kingdom, Canada, and the United States.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">3. Account Registration</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must provide a valid email address and phone number. Business accounts require a valid CAC registration number.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">4. User Responsibilities</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>You will not use the Service for any unlawful purpose.</li>
              <li>You will not attempt to interfere with or disrupt the Service.</li>
              <li>You will not impersonate any person or entity.</li>
              <li>You will not share your account credentials with third parties.</li>
              <li>Riders must comply with all applicable traffic and transportation laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">5. Subscription & Payments</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Rider accounts are free. Business accounts include a 7-day free trial, after which subscription fees apply: Standard ₦10,000/month, Premium ₦30,000/month. Payments are non-refundable unless required by law. We reserve the right to modify pricing with 30 days' notice.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">6. Intellectual Property</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All content, trademarks, logos, and intellectual property on the Loca8tor platform are owned by or licensed to Loca8tor. You may not copy, modify, distribute, or create derivative works without our written consent.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">7. Location Data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Service uses GPS and IP-based location data to provide its core functionality. By using the Service, you consent to the collection and processing of your location data as described in our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">8. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Loca8tor is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including inaccurate location data or delivery delays.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">9. Termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time for violations of these Terms. You may delete your account at any time by contacting us. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">10. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated date. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">11. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For questions about these Terms, please <Link to="/contact" className="text-primary hover:underline">contact us</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
