# WeGive mobile

Expo (React Native) app for WeGive, sharing the same Supabase project as
the web app in the repo root: same accounts, same auth, same database.

## Status

This is a starting scaffold, not a full port of the website. What's here:

- Expo Router navigation, split into an `(auth)` group (login, signup)
  and a `(tabs)` group (Browse, Profile), gated by a real Supabase
  session.
- A Supabase client (`lib/supabase.ts`) configured for React Native:
  session persistence via `AsyncStorage` instead of cookies, since
  there's no browser here.
- Login and signup screens calling real `supabase.auth` methods, storing
  the same `full_name` / `phone` / `country` fields in user metadata
  that the web signup flow writes, so an account created on either
  platform looks the same on both.
- A Profile screen reading that metadata, with sign out.
- A Browse tab that's currently just an honest empty state. Giveaways,
  claims, and deliveries aren't backed by real database tables yet on
  either platform, that's the same larger migration flagged for the
  website.

Not yet ported from the web app: the multi-step signup with postcode/
address collection, browse/claim/delivery flows, payments, and the
rest of the portal pages. Add them the same way the login/signup
screens were built here: call the same `supabase` client, using the
same table/column names once those tables exist.

## Setup

```
cd mobile
npm install
cp .env.example .env.local   # fill in your real Supabase URL and anon key
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) for the fastest way to see
it running on a real device, or press `i` / `a` in the terminal for a
simulator if you have Xcode / Android Studio installed.

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` should be
the exact same values as `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in the web app's `.env.local`, just
re-prefixed for Expo's client-exposed env var convention.

## Publishing to the App Store / Play Store

This scaffold hasn't been built or submitted anywhere yet. When ready:

1. Create an [Expo (EAS)](https://expo.dev) account and run
   `npx eas login`, then `npx eas build:configure`.
2. Set the real `EXPO_PUBLIC_SUPABASE_*` values as EAS build secrets
   (`npx eas secret:create`) so production builds don't rely on a local
   `.env.local`.
3. `npx eas build --platform ios` / `--platform android` to produce a
   store-ready build. iOS builds need an active Apple Developer Program
   membership ($99/year); Android needs a Google Play Developer account
   ($25 one-time).
4. `npx eas submit` to upload the build to App Store Connect / Play
   Console, then fill in store listing details (screenshots,
   description, privacy policy URL) and submit for review.

`app.json` already sets placeholder bundle identifiers
(`com.workerholics.wegive`) for both platforms, update those if you
want different ones.
