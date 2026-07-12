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

## What's built

- Checkout (`app/checkout.tsx`): address form, order creation via
  `/api/orders/create`, payment via `react-native-razorpay` (native
  module — see note below), verification via `/api/payment/verify`.
  ANgroup's backend always creates a Razorpay order regardless of
  `paymentMethod` (confirmed by reading `order.service.ts` — there's no
  COD path server-side), so this is the only checkout flow possible today.
- Order history (`app/orders/index.tsx`) and order detail/tracking
  (`app/orders/[id].tsx`), using the same "filter /api/orders/list
  client-side" workaround Native's web SDK uses, since ANgroup has no
  customer-scoped orders endpoint.
- Wishlist screen (`app/wishlist.tsx`), wired to the existing
  `src/api/wishlist.ts` client.
- Profile screen (`app/profile.tsx`): name/email, links to orders/wishlist,
  sign out.

**`react-native-razorpay` requires a native module** — it will NOT work in
Expo Go. Use `npx expo prebuild` + a custom dev client (or EAS Build) once
you're ready to test the checkout flow on a device/simulator. Set
`app.json`'s `expo.extra.razorpayKeyId` to the same key ANgroup's web
checkout uses.

## What's NOT built yet (next phases)

- Change password / saved addresses (beyond the one-off checkout address
  form)
- Push notifications: needs a `POST /api/notifications/register-device`
  route added to ANgroup (doesn't exist yet) + Expo Notifications setup
- App icons/splash assets (`assets/icon.png` etc. — referenced in
  `app.json` but not created), store screenshots, privacy policy page
- EAS Build/Submit configuration for actual App Store / Play Store release
- Server-side COD support doesn't exist on ANgroup at all — if you want a
  cash-on-delivery option in the app, that has to be added to
  `order.service.ts`/`orders/create` first, not just the client

## Reused from Native

Endpoint contracts and response shapes are the exact ones Native's own
`ANGROUP_INTEGRATION_STATUS.md` and `lib/an-sdk/*` already worked out
against the real ANgroup backend — this app is a second client of the same
API, not a redesign.
