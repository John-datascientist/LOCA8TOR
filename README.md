# WeGive Web

WeGive is a social distribution network: a platform where people and
businesses giving away useful items connect with people who need them, with
location intelligence and delivery infrastructure making the exchange
possible. Location, postcodes, distance, routing and delivery tracking are
powered by **Loca8tor**, a sibling product under Workerholics Solutions.

This repository is the WeGive **frontend**: a Next.js (App Router,
TypeScript, Tailwind CSS) application implementing the platform's full page
structure and a fully built homepage and signup flow. It also contains a
starting Expo/React Native mobile app scaffold under `mobile/`, sharing the
same Supabase project (same accounts, same database) as this website. See
`mobile/README.md`.

## What's built

- **Every route in the platform spec** (public, auth, user, giveaway,
  delivery, business, rider and admin sections) exists and renders, with a
  shared design system (`components/ui.tsx`, `components/legal-page.tsx`,
  `components/portal-shell.tsx`).
- **Static & legal pages** (`app/about`, `app/how-it-works`, `app/business`,
  `app/safety`, `app/contact`, `app/privacy`, `app/terms`, `app/give`):
  fully written, not placeholders. Real policy sections, an FAQ tying
  together escrow/sponsorship, contact channels by topic, and stats/
  architecture explainers.
- **Homepage** (`app/page.tsx`): hero, "How WeGive Works", "Giveaways Near
  You", "Help Someone Get Their Giveaway", "Businesses Give Too", and
  "Powered by Loca8tor", using representative mock data.
- **Signup flow** (`app/signup/page.tsx`): account details plus a country
  selector (Nigeria, UK, US, Canada), then a home postcode step with
  "Enter Existing Postcode" (validated against that country's real format)
  and "Generate My Postcode" (simulating the invisible Loca8tor round trip:
  request location → resolve postcode → display), and the home-location
  confirmation checkbox.
- **Multi-country currency** (`lib/location.ts`, `lib/location-server.ts`):
  the country chosen at signup is stored in a cookie and read by every
  page that displays money (`formatCurrency`), converting the platform's
  Naira-denominated mock amounts into the selected currency. Changeable
  later from Settings via `components/country-switcher.tsx`.
- **Give-to-receive reciprocity** (`canClaimMore` in `lib/mock-data.ts`):
  after a recipient's first claim, further claims are gated behind
  listing a giveaway of their own, surfaced on the giveaway detail page,
  Browse, and the dashboard.
- **Category subcategories** (`lib/categories.ts`): each category (Furniture,
  Electronics, Food, Clothing) has its own subcategories (e.g. Clothing:
  Men/Women/Children), selectable when listing an item and filterable on
  Browse via URL params.
- **Giveaway detail / claim / delivery pages**: illustrate the listing
  lifecycle, the 30-minute reservation pattern, and the delivery payment
  breakdown (distance → delivery fee → VAT → admin fee → sponsor
  contribution → amount due).
- **Full delivery & return addresses** (`components/address-fields.tsx`):
  the recipient's delivery address is collected on the delivery/payment
  page, and the giver's return address (used only if a delivery can't be
  completed) on the create-giveaway form. Field labels adapt per country
  (State/County/Province, and each country's own postcode format).
- **New-listing notifications**: submitting a giveaway confirms that
  nearby members are notified by in-app and email once it's approved.
  `components/notification-preferences.tsx` (on Settings) lets a user
  control which notification types go in-app vs. email, per type, and
  `lib/mock-data.ts`'s `notifications` list includes example "New
  listing" entries showing which channels they went out on.
- **Payment & escrow UI** (`components/payment-panel.tsx`): shared by the
  delivery payment step and the sponsor checkout flow
  (`app/sponsor/[id]`). Payers choose card or bank transfer; the UI frames
  every payment as going into WeGive's escrow wallet and being released to
  the rider only once delivery is confirmed. `app/admin/payments` shows the
  escrow wallet balance and a transaction ledger (held / released /
  refunded) alongside the pricing configuration.
- **User, business, rider and admin portals**: a shared sidebar shell
  (`components/portal-shell.tsx`) with role-appropriate navigation, stat
  cards and empty states.

Everything here is **UI only**, driven by mock data in `lib/mock-data.ts`.
There is no backend, database, authentication, or Loca8tor API integration
yet, see below for what that requires.

## Architecture principles this build follows

Per the platform spec, the following boundaries are treated as
non-negotiable for the real implementation (not yet built, but the UI is
shaped around them):

- **The frontend never calculates money.** Delivery fee, VAT and the
  WeGive administration fee are always computed server-side by a single
  pricing engine (`calculateDeliveryFee`), configured by admins
  (`VAT_RATE`, `ADMIN_FEE`, per-vehicle rates, `BASE_FEE`, `PER_KM_RATE`),
  never hard-coded per component. The delivery breakdown UI
  (`app/giveaway/[id]/delivery`) is laid out to display, not compute, these
  numbers.
- **WeGive owns**: users, giveaways, claims, reservations, sponsorships,
  delivery orders, transactions, campaigns, reports, and WeGive-specific
  notifications/moderation.
- **Loca8tor owns**: postcodes, location resolution, distance, routing,
  navigation, live tracking, and rider/fleet infrastructure, consumed only
  through the official Loca8tor API, never by touching Loca8tor's database
  directly.
- **Location privacy**: public listings show an approximate area and
  distance only; exact addresses are revealed to the relevant parties only
  after a delivery is confirmed and authorized.
- **Reservations expire.** Claiming an item creates a time-limited
  reservation (default 30 minutes, admin-configurable), not a permanent
  hold.
- Before adding new tables for users, locations, postcodes, drivers,
  vehicles, fleets, payments, or API clients, check whether the entity
  already exists; don't duplicate what WeGive or Loca8tor already own.

## What's not built yet

This is a frontend scaffold, not a working product. Building it out
further needs, roughly in order:

1. A database and auth (users, sessions, roles: giver/recipient/business/
   rider/admin).
2. Giveaway CRUD with the category-driven dynamic form, the
   `DRAFT → PENDING_REVIEW → APPROVED → AVAILABLE → RESERVED → CLAIMED →
   DELIVERY_PENDING → DELIVERED → COMPLETED` lifecycle, and admin
   moderation.
3. The server-side delivery pricing engine and a `PaymentService`
   abstraction (provider-agnostic, so WeGive isn't locked to one payment
   processor).
4. The Loca8tor API integration for postcode generation/resolution,
   distance/routing, and live tracking, consumed via Loca8tor's public
   API, not its database.
5. Notifications (in-app first, then email/SMS/push) and scoped messaging
   (giver↔recipient after a claim; rider↔recipient during active delivery).
6. Admin configuration (categories, verification requirements, pricing,
   reservation duration, claim limits) and audit logging for every admin
   action (who, what, when, previous/new value).

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint     # eslint
```

## Project structure

```
app/                  Route segments (App Router), one folder per page in the spec
components/           Shared UI: design system primitives, header/footer,
                       auth card, legal-page, portal shell/widgets
lib/nav.ts             Public nav + footer link groups
lib/portal-nav.ts      Sidebar nav for user/business/rider/admin portals
lib/mock-data.ts       Placeholder data for giveaways and sponsorships
lib/categories.ts      Category → subcategory tree
lib/location.ts        Country configs: currency, postcode format/validation
lib/location-server.ts Reads the signup-selected country cookie server-side
```
