# AN Group Mobile (Expo / React Native)

The native Android/iOS app for the storefront, calling the same ANgroup
backend as the Native web storefront. Lives in this repo (`/mobile`) as its
own package, separate from the Next.js app at the repo root — it has its
own `package.json` and dependency tree, install/run it from inside this
folder.

## Setup

```bash
cd mobile
npm install
```

Edit `app.json`'s `expo.extra`:
- `anApiUrl` — the deployed ANgroup URL (same value as Native's
  `NEXT_PUBLIC_AN_API`)
- `anBusinessId` — Native's Business `_id` inside ANgroup (same value as
  Native's `NEXT_PUBLIC_AN_BUSINESS_ID`)

Then:

```bash
npm run start      # Expo dev server — scan the QR with Expo Go
npm run ios        # requires macOS + Xcode
npm run android    # requires Android Studio / emulator
```

## What's here

- `src/api/*` — ported from Native's `lib/an-sdk/*`, same endpoints/shapes,
  adapted for React Native: `expo-secure-store` instead of `localStorage`
  for the auth token, Bearer-token-only (no cookie fallback, since RN
  fetch has no cookie jar).
- `src/context/AuthContext.tsx`, `CartContext.tsx` — session + local cart
  state.
- `app/` — Expo Router screens: home (product grid), login, product
  detail, cart.

## What's NOT built yet (next phases)

- Checkout: address collection, Razorpay **React Native** SDK (different
  package from the web checkout Native uses), `/api/payment/verify` call
- Order history / order tracking screens
- Wishlist screen (the API client — `src/api/wishlist.ts` — is ready, no
  screen wired to it yet)
- Profile / change password / addresses
- Push notifications: needs a `POST /api/notifications/register-device`
  route added to ANgroup (doesn't exist yet) + Expo Notifications setup
- App icons/splash assets (`assets/icon.png` etc. — referenced in
  `app.json` but not created), store screenshots, privacy policy page
- EAS Build/Submit configuration for actual App Store / Play Store release

## Reused from Native

Endpoint contracts and response shapes are the exact ones Native's own
`ANGROUP_INTEGRATION_STATUS.md` and `lib/an-sdk/*` already worked out
against the real ANgroup backend — this app is a second client of the same
API, not a redesign.
