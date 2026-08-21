# Loca8tor

Nigerian postcode generator and delivery/address platform (loca8tor.com). Turns a location into a shareable postcode so riders/couriers can find it. Also supports rider/business accounts, wallets, referrals, and subscriptions.

## Stack

- Vite + React 18 + TypeScript, Tailwind + shadcn/radix components
- React Router (`src/App.tsx` for the route table)
- Supabase: Postgres + Auth + Storage + Edge Functions (`supabase/`)
- Capacitor wraps the same web build for Android/iOS (`capacitor.config.ts`)
- Deployed on Vercel (frontend) + Supabase (backend/edge functions)

## Commands

```
npm run dev        # vite dev server on :8080
npm run build       # production build to dist/
npm run lint         # eslint
npm test              # vitest run (src/**/*.test.ts)
npm run test:watch
```

## Structure

- `src/pages/` — one file per route, lazy-loaded in `src/App.tsx`
- `src/components/` — shared UI; `src/components/ui/` is shadcn primitives, don't hand-edit generated ones without checking `components.json`
- `src/integrations/supabase/` — generated Supabase client + DB types (`types.ts` is generated, regenerate via Supabase CLI rather than hand-editing)
- `src/integrations/auth/social.ts` — Google/Apple/Microsoft OAuth via `supabase.auth.signInWithOAuth`
- `src/hooks/useUserAccess.ts` — country detection + super-admin/preview gating used across the app
- `supabase/migrations/` — SQL migrations, timestamp-prefixed, applied in order
- `supabase/functions/` — Deno edge functions, one dir per function; `supabase/functions/mcp/` is a hand-maintained MCP server (not auto-generated — see its header comment)

## Auth notes

- Google sign-in redirects the whole page (`supabase.auth.signInWithOAuth`), then `App.tsx`'s `GoogleAccountRuleEnforcer` runs post-redirect to block business/rider accounts from using Google sign-in (they must use email+password). Don't move that check back into the button's click handler — the redirect happens before any code after `signInWithOAuth` runs.
- `/.lovable/oauth/consent` (`src/pages/OAuthConsent.tsx`) is the consent screen for the MCP server's OAuth flow. The path predates the Lovable migration; renaming it requires updating the redirect URI registered in the Supabase dashboard first.

## Working with Supabase

- Local secrets live in `.env` (gitignored, never commit it). Get real values from the Supabase dashboard (Project Settings → API) or `supabase status` if running locally.
- Migrations: `supabase migration new <name>`, then `supabase db push` (or apply via the dashboard SQL editor). Never edit a migration that's already been applied elsewhere.
- Edge functions: `supabase functions deploy <name>`. Check `supabase/config.toml` for each function's `verify_jwt` setting before adding a new one — webhook-style functions (Stripe, Paga) verify their own signatures and run with `verify_jwt = false`.

## Deploying

- Frontend: push to the branch Vercel is tracking, or `vercel --prod`. Vite is auto-detected; `vercel.json` handles SPA rewrites for React Router.
- Backend: `supabase functions deploy` and `supabase db push` are separate from the Vercel deploy — nothing pushes these automatically.
- Mobile (Capacitor): `npm run build && npx cap sync`, then build from Android Studio / Xcode. Verify OAuth sign-in on-device before shipping — it hasn't been tested against the native WebView since the Lovable Cloud Auth removal.
