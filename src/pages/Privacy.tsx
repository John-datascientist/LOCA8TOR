import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { ArrowLeft } from 'lucide-react';
import logoImg from '@/assets/loca8tor-logo-green.png';

export default function Privacy({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className={embedded ? '' : 'min-h-screen bg-background'}>
      {!embedded && <SEO title="Privacy Policy — Loca8tor" description="Learn how Loca8tor collects, uses, and protects your personal data and location information." path="/privacy" />}
      <div className={embedded ? 'max-w-3xl mx-auto px-5 py-6' : 'max-w-3xl mx-auto px-5 py-12'}>
        {!embedded && (
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        )}

        <div className="flex items-center gap-3 mb-8">
          {!embedded && <img src={logoImg} alt="Loca8tor" className="w-10 h-10 rounded-lg object-cover" />}
          <h1 className={embedded ? 'font-heading text-2xl font-extrabold' : 'font-heading text-3xl font-extrabold'}>Privacy Policy</h1>
        </div>

        <p className="text-xs text-muted-foreground mb-8">Last updated: July 9, 2026 · Effective date: July 9, 2026</p>

        <div className="rounded-lg border border-border bg-card/40 p-4 mb-8 text-sm text-muted-foreground leading-relaxed">
          This Privacy Policy explains, in plain language, exactly what Loca8tor collects when you generate a postcode,
          book a delivery, sign up as a rider or business, or simply browse the site. It is maintained by Workerholics
          Solutions Ltd, the company that operates Loca8tor, and is reviewed at least every six months. If anything here
          is unclear, you can reach a real human at <a href="mailto:support@loca8tor.com" className="text-primary hover:underline">support@loca8tor.com</a>.
        </div>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">1. Who we are</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Loca8tor is a postcode generation, address-resolution and delivery-operations platform owned and operated by
              <strong className="text-foreground"> Workerholics Solutions Ltd</strong>, a company registered in the United Kingdom and
              with operations in Nigeria. In this policy, "Loca8tor", "we", "us" and "our" refer to Workerholics Solutions Ltd.
              You ("you", "the user") are anyone who visits www.loca8tor.com, installs our mobile app, signs up for an
              individual, rider, business or developer account, or interacts with a Loca8tor postcode, tracking link or API.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              For the purposes of the UK GDPR, the EU GDPR and Nigeria's NDPR, Workerholics Solutions Ltd is the
              <strong className="text-foreground"> data controller</strong> of personal data processed through Loca8tor. Where a business
              account uploads its own customers or riders to the platform, that business is the controller of <em>its</em>
              customer/rider data and Loca8tor acts as the <strong className="text-foreground">data processor</strong> on their behalf.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">2. The data we collect, and exactly why</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              We try to collect as little data as we can while still giving you a reliable product. Every category below
              lists the specific fields, the lawful basis we rely on, and the typical retention period.
            </p>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-heading text-sm font-bold text-foreground mb-1">Account information</h3>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Fields:</strong> full name, email address, mobile phone number, password hash, country, optional business name, optional CAC/registration number, optional referral code.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Why:</strong> to create and secure your account, send verification links, contact you about subscriptions, and prevent duplicate or fraudulent sign-ups.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Lawful basis:</strong> performance of a contract (Art. 6(1)(b) GDPR; equivalent NDPR provision). <strong className="text-foreground">Retention:</strong> for the life of the account plus 90 days after deletion, then anonymised.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-heading text-sm font-bold text-foreground mb-1">Precise location data</h3>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Fields:</strong> GPS latitude/longitude (rounded to a ~50&nbsp;m grid for generated postcodes), GPS accuracy in metres, optional altitude/heading/speed while a rider is on an active delivery, and the reverse-geocoded street/area name returned by OpenStreetMap Nominatim.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Why:</strong> to generate the unique postcode you asked for, to render live rider tracking for customers, to power the in-app live map for businesses, and to enforce country-level geo restrictions.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">When:</strong> only while you actively press "Generate", open the map, or are on shift as a rider. We do <em>not</em> track your location in the background outside of an accepted delivery.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Lawful basis:</strong> explicit consent (you must approve the browser/OS prompt). <strong className="text-foreground">Retention:</strong> generated postcodes are kept indefinitely so the code keeps resolving; per-second rider trails are deleted 30 days after the delivery is completed.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-heading text-sm font-bold text-foreground mb-1">Device and technical data</h3>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Fields:</strong> IP address, approximate country derived from IP, browser user-agent, operating system, screen size, app version, and a randomly generated device ID stored in local storage.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Why:</strong> security (rate limiting, abuse detection, device-bound withdrawal checks), debugging, and to remember your session so you don't re-login on every visit.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Lawful basis:</strong> legitimate interest in keeping the platform secure (Art. 6(1)(f) GDPR). <strong className="text-foreground">Retention:</strong> security logs are kept for 12 months, then deleted.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-heading text-sm font-bold text-foreground mb-1">Delivery and operational data</h3>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Fields:</strong> pickup and drop-off postcodes/addresses, recipient name, recipient phone, parcel description, cash-on-delivery amount, delivery status, signed proof-of-delivery photo and timestamp, rider rating, and tip amount.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Why:</strong> to fulfil the delivery, give the customer a real-time tracking link, settle COD with the business, and resolve disputes.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Lawful basis:</strong> contract with the booking business; the business is the controller of recipient data and uses Loca8tor as a processor. <strong className="text-foreground">Retention:</strong> 24 months for tax/dispute purposes, then deleted or anonymised.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-heading text-sm font-bold text-foreground mb-1">Payment and wallet data</h3>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Fields:</strong> wallet balance, transaction history, Paga/Stripe transaction reference. We do <em>not</em> see, store or process raw card numbers — those are entered directly into Stripe's PCI-DSS-certified iframe.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Lawful basis:</strong> contract and legal obligation (record-keeping under Nigerian and UK tax law). <strong className="text-foreground">Retention:</strong> minimum 7 years to satisfy statutory accounting requirements.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-heading text-sm font-bold text-foreground mb-1">Quiz and engagement data</h3>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Fields:</strong> quiz scores, answers chosen, time taken, daily-streak counter, referral code used.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Why:</strong> to award airtime/data rewards fairly, prevent multi-accounting, and improve the question bank.</p>
                <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Lawful basis:</strong> contract. <strong className="text-foreground">Retention:</strong> 12 months from the last quiz attempt.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">3. How we use your data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use your data only for the purposes listed in Section&nbsp;2, plus the limited additional uses below. We do
              <strong className="text-foreground"> not</strong> sell your personal data, we do <strong className="text-foreground">not</strong> rent it to data brokers, and we do
              <strong className="text-foreground"> not</strong> use it to train third-party advertising profiles.
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Service delivery:</strong> generating postcodes, routing riders, settling COD, paying out referral and quiz rewards.</li>
              <li><strong className="text-foreground">Security &amp; fraud prevention:</strong> rate limiting, device-binding withdrawals, detecting multi-account abuse of free trials and referral bonuses.</li>
              <li><strong className="text-foreground">Customer support:</strong> answering tickets at support@loca8tor.com — agents can only see the minimum data needed to resolve your issue.</li>
              <li><strong className="text-foreground">Service communications:</strong> transactional emails (verification, payment receipts, subscription warnings, password resets). You cannot opt out of these while you have an active account.</li>
              <li><strong className="text-foreground">Optional marketing:</strong> only if you tick the marketing box during sign-up. Every marketing email has a one-click unsubscribe link.</li>
              <li><strong className="text-foreground">Product analytics:</strong> aggregated, non-identifying metrics (page views, feature usage) used to prioritise improvements.</li>
              <li><strong className="text-foreground">Legal compliance:</strong> responding to lawful requests from regulators, courts and law-enforcement agencies in Nigeria, the UK, the US and Canada.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">4. How location data works in detail</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Loca8tor is, at its heart, a location product, so this section deserves its own explanation. When you press
              <em> Generate</em>, your browser or our mobile app asks the operating system for a single GPS fix. We require
              an accuracy of 60&nbsp;m or better; anything coarser is rejected and you'll be asked to try again outdoors. The
              accepted coordinates are then snapped to a ~50&nbsp;m grid (so two devices standing at the same address always
              receive the same postcode) and stored against the generated code.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              For riders, location is only streamed to our servers (every 2–5 seconds) while you are on shift and assigned
              to an active delivery. The stream stops automatically when the delivery is marked complete or you tap "End
              shift". The mobile app shows a persistent notification whenever background location is being used, and you
              can revoke the permission from your phone's settings at any time without losing access to other features.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              IP-based geolocation (country level only) is used to enforce our geographic restrictions — Loca8tor is
              currently available only in Nigeria, the United Kingdom, the United States and Canada. We do not use IP to
              derive a precise street address.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">5. Where your data is stored and how it is protected</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Loca8tor runs on managed cloud infrastructure hosted within the European Union (primary region: Frankfurt,
              eu-central-1) with read replicas in eu-west-2 (London). All data is encrypted in transit using TLS&nbsp;1.2+
              and at rest using AES-256. Database access is restricted to a small number of named engineers using
              hardware-token-protected, audit-logged accounts.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Every table that stores user data is protected by row-level security (RLS) policies, meaning the database
              itself refuses to return a row to a user who isn't entitled to see it — even if our application code had a
              bug. Withdrawals, admin actions and rider location streams are additionally bound to a hashed device ID and
              IP address to make stolen sessions easy to detect.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Backups are taken every 24 hours and retained for 30 days in the same EU region. Proof-of-delivery photos
              are stored in a private object bucket and served only via short-lived signed URLs.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">6. Who we share data with (sub-processors)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We rely on a small number of vetted sub-processors. Each one is bound by a written Data Processing
              Agreement and is only given the minimum data it needs to perform its task.
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs border border-border">
                <thead className="bg-card/40">
                  <tr>
                    <th className="text-left p-2 border-b border-border font-heading">Sub-processor</th>
                    <th className="text-left p-2 border-b border-border font-heading">Purpose</th>
                    <th className="text-left p-2 border-b border-border font-heading">Data category</th>
                    <th className="text-left p-2 border-b border-border font-heading">Region</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr><td className="p-2 border-b border-border">Supabase</td><td className="p-2 border-b border-border">Database, auth, storage, edge functions</td><td className="p-2 border-b border-border">All user data</td><td className="p-2 border-b border-border">EU (Frankfurt)</td></tr>
                  <tr><td className="p-2 border-b border-border">Stripe</td><td className="p-2 border-b border-border">Card payments &amp; subscriptions</td><td className="p-2 border-b border-border">Name, email, card token</td><td className="p-2 border-b border-border">EU / US (PCI-DSS L1)</td></tr>
                  <tr><td className="p-2 border-b border-border">Paga</td><td className="p-2 border-b border-border">NGN bank transfers &amp; wallet top-ups</td><td className="p-2 border-b border-border">Name, phone, transaction ref</td><td className="p-2 border-b border-border">Nigeria</td></tr>
                  <tr><td className="p-2 border-b border-border">Resend</td><td className="p-2 border-b border-border">Transactional email delivery</td><td className="p-2 border-b border-border">Email address, message body</td><td className="p-2 border-b border-border">EU / US</td></tr>
                  <tr><td className="p-2 border-b border-border">OpenStreetMap / Nominatim</td><td className="p-2 border-b border-border">Reverse geocoding &amp; address lookup</td><td className="p-2 border-b border-border">Lat/long only (no account ID)</td><td className="p-2 border-b border-border">EU</td></tr>
                  <tr><td className="p-2 border-b border-border">OSRM</td><td className="p-2 border-b border-border">Route planning between two points</td><td className="p-2 border-b border-border">Lat/long pairs only</td><td className="p-2 border-b border-border">EU</td></tr>
                  <tr><td className="p-2 border-b border-border">Google AdSense</td><td className="p-2 border-b border-border">Advertising on free pages</td><td className="p-2 border-b border-border">Cookie ID, IP, page URL</td><td className="p-2 border-b border-border">Global</td></tr>
                  <tr><td className="p-2">Google Sign-In (OAuth)</td><td className="p-2">Optional sign-in method</td><td className="p-2">Google ID, email, name</td><td className="p-2">Global</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              Personal data shared with a sub-processor outside the EU/UK is transferred under the European Commission's
              <strong className="text-foreground"> Standard Contractual Clauses (2021)</strong> together with the UK Addendum. We will publish a notice on
              this page at least 30 days before adding a new sub-processor that handles user data.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">7. Advertising, cookies and local storage</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Loca8tor displays Google AdSense advertising on a limited number of free, non-authenticated pages to help
              fund the free tier of the product. We do <strong className="text-foreground">not</strong> show advertising on dashboards, the rider app, the
              business console, or any page where you are signed in.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              <strong className="text-foreground">Third-party vendors, including Google,</strong> use cookies to serve ads based on a user's prior
              visits to our website or other websites. Google's use of advertising cookies enables it and its partners to
              serve ads to our users based on their visit to Loca8tor and/or other sites on the Internet.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Google, as a third-party vendor, uses the <strong className="text-foreground">DoubleClick DART cookie</strong> to serve ads on our site. Users
              may opt out of personalised advertising by visiting
              <a className="text-primary hover:underline" href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer"> Google Ads Settings</a>.
              You may also opt out of a third-party vendor's use of cookies for personalised advertising by visiting
              <a className="text-primary hover:underline" href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer"> www.aboutads.info</a> or
              <a className="text-primary hover:underline" href="https://youradchoices.com" target="_blank" rel="noopener noreferrer"> youradchoices.com</a>.
              For details on how Google uses data when you use our partners' sites or apps, see
              <a className="text-primary hover:underline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer"> policies.google.com/technologies/partner-sites</a>,
              and Google's advertising policies at
              <a className="text-primary hover:underline" href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer"> policies.google.com/technologies/ads</a>.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Users in the <strong className="text-foreground">European Economic Area, the United Kingdom and Switzerland</strong> are shown Google's
              IAB TCF v2.2 consent prompt (via Google's certified Consent Management Platform) before any non-essential
              advertising cookies are set, and can freely grant, refuse or withdraw consent at any time. Users in
              California are treated in accordance with the CCPA/CPRA and may exercise the "Do Not Sell or Share My
              Personal Information" right by emailing <a className="text-primary hover:underline" href="mailto:privacy@loca8tor.com">privacy@loca8tor.com</a>.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Loca8tor does <strong className="text-foreground">not</strong> knowingly permit ad personalisation for users under 16, and passes the
              <code className="px-1 py-0.5 rounded bg-muted text-foreground">tag_for_child_directed_treatment</code> and
              <code className="px-1 py-0.5 rounded bg-muted text-foreground">tag_for_under_age_of_consent</code> signals to Google where applicable.
              We also do not place advertising alongside sensitive content categories restricted by the
              <a className="text-primary hover:underline" href="https://support.google.com/adsense/answer/48182" target="_blank" rel="noopener noreferrer"> AdSense Program Policies</a>.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              We also use a small amount of <strong className="text-foreground">browser local storage</strong> (not cookies) to remember your theme, your
              recent postcodes, your session token, and your device ID. These are strictly necessary for the product to
              work and cannot be disabled separately, but you can clear them at any time from your browser settings.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              We do <strong className="text-foreground">not</strong> use third-party analytics trackers such as Facebook Pixel or TikTok Pixel.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">8. Your rights and how to exercise them</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Under the UK GDPR, EU GDPR, Nigeria's NDPR, California's CCPA/CPRA and Canada's PIPEDA, you have the
              following rights — most of which you can exercise yourself from inside the app:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Access:</strong> download a JSON export of every record we hold about you from <em>Settings → Privacy → Export my data</em>.</li>
              <li><strong className="text-foreground">Rectification:</strong> edit your name, phone, business details and email from your account settings.</li>
              <li><strong className="text-foreground">Erasure ("right to be forgotten"):</strong> use <em>Settings → Delete my account</em>, or email support@loca8tor.com. Account data is permanently deleted within 30 days, except records we must keep for tax (7 years) or fraud investigation purposes.</li>
              <li><strong className="text-foreground">Restriction &amp; objection:</strong> pause marketing, location tracking or rider streaming at any time.</li>
              <li><strong className="text-foreground">Portability:</strong> the JSON export is machine-readable and can be moved to any compatible provider.</li>
              <li><strong className="text-foreground">Withdraw consent:</strong> revoke location, notifications or marketing consent without losing the rest of your account.</li>
              <li><strong className="text-foreground">Lodge a complaint:</strong> with the UK Information Commissioner's Office (ico.org.uk), the Nigeria Data Protection Commission (ndpc.gov.ng) or your local supervisory authority.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              We respond to all rights requests within 30 days and never charge a fee for the first request in any 12-month period.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">9. Children's privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Loca8tor is not intended for and is not marketed to anyone under the age of 16. We do not knowingly create
              accounts for, or collect data from, children. If you believe a child has signed up, please email
              support@loca8tor.com and we will delete the account and all associated data within 7 days.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">10. Data breach notification</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              In the unlikely event of a personal-data breach that is likely to result in a risk to your rights or
              freedoms, we will notify the relevant supervisory authority within 72 hours of becoming aware of it, and
              will notify affected users by email without undue delay. Our incident-response runbook is reviewed
              quarterly and tested at least once a year.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">11. Automated decision-making</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use a small number of automated rules — for example, refusing a withdrawal that exceeds your daily quiz
              limit, or suspending an account that fails too many login attempts. These rules have a meaningful effect on
              your use of the service, so you can always request a human review by emailing support@loca8tor.com. We do
              not perform automated profiling for advertising, credit-scoring or insurance purposes.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">12. International transfers</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Although our primary database lives in the EU, some sub-processors (Stripe, Resend, Google) process data in
              the United States or globally. Where this is the case, transfers rely on the European Commission's adequacy
              decisions where available, and otherwise on the Standard Contractual Clauses (2021) plus the UK
              International Data Transfer Addendum. Copies of these safeguards are available on request.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">13. Data retention summary</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              In one place, for clarity:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1 mt-2">
              <li>Generated postcodes &amp; coordinates → indefinite (so the code keeps resolving).</li>
              <li>Rider location trails → 30 days after delivery completion.</li>
              <li>Delivery records → 24 months.</li>
              <li>Payment &amp; wallet ledger → 7 years (statutory).</li>
              <li>Account profile → life of account + 90 days, then anonymised.</li>
              <li>Security &amp; audit logs → 12 months.</li>
              <li>Quiz history → 12 months from last attempt.</li>
              <li>Support tickets → 3 years.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">14. Changes to this policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We review this policy every six months. Material changes (anything that meaningfully reduces your privacy
              protections, adds a new sub-processor or expands the categories of data we collect) will be announced by
              email at least 30 days before they take effect, and the "Last updated" date at the top of this page will be
              changed. Minor clarifications and typo fixes may be made without notice.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-foreground">15. Contact &amp; data protection officer</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions, complaints, deletion requests and rights enquiries should be sent to:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-none pl-0 space-y-1 mt-2">
              <li><strong className="text-foreground">Data controller:</strong> Workerholics Solutions Ltd</li>
              <li><strong className="text-foreground">Email:</strong> <a className="text-primary hover:underline" href="mailto:support@loca8tor.com">support@loca8tor.com</a></li>
              <li><strong className="text-foreground">DPO (Data Protection Officer):</strong> dpo@loca8tor.com</li>
              <li><strong className="text-foreground">Postal:</strong> Workerholics Solutions Ltd, United Kingdom (full registered address available on request).</li>
              <li><strong className="text-foreground">Web form:</strong> <Link to="/contact" className="text-primary hover:underline">/contact</Link></li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              We aim to respond to every privacy enquiry within 5 working days and to resolve formal rights requests
              within 30 days, as required by law.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
