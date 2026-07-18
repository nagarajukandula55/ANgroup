# AN Command

Unified mobile command center for AN group — one app for you and your team
to see and act on everything across the AN repos, instead of juggling each
service's own admin panel. This is **not** the customer-facing storefront
app (that's `ANgroup/mobile`) — this is the internal/admin app.

## Status: Phase 1 skeleton

What exists right now:
- Expo Router app shell with auth gate (`app/_layout.tsx`)
- Login screen wired to ANgroup's real `/api/auth/login` endpoint
  (`src/api/auth.ts`, `app/login.tsx`)
- Tab shell: Dashboard / Team Chat / Settings (`app/(tabs)/*`)
- Dashboard pulls ANgroup's `/api/dashboard/overview` (ERP metrics) —
  raw JSON rendering for now, needs real UI once the shape is confirmed
  working over Bearer auth (see Known gaps below)
- **Service registry** (`src/config/services.ts`) — the extensibility
  point. Every backend this app talks to is one entry here (id, base URL
  env key, kind). Adding a future repo/service means adding one entry and
  its base URL in `app.json`'s `extra` — no other app code changes.
- Secure token storage via `expo-secure-store`, shared fetch client
  (`src/api/client.ts`) that attaches the Bearer token to every
  service call.

## Not yet built

- Team chat (`app/(tabs)/chat.tsx` is a placeholder) — needs
  an-communications-platform's API surface documented/added to the
  service registry before it can be wired up for real.
- Mail (an-mail-platform), dev/CI status (GitHub), AN-Technologies,
  zenforge, an-dev-studio — all disabled in the service registry
  (`enabled: false`) pending their API details.
- Push notifications.
- Per-role permission gating in the app UI (ANgroup's backend already
  has a rich permission system — `isSuperAdmin`, `isPlatformStaff`,
  granted role permissions from login — the app should reflect it
  instead of assuming full access for anyone who can sign in).

## Known gaps / things to verify before this is usable

- `/api/dashboard/overview` on ANgroup uses `getEnrichedSession()`,
  which today reads a cookie-set session. React Native's fetch has no
  cookie jar, so this app sends the JWT as `Authorization: Bearer`
  instead — **confirm `getEnrichedSession()` (or middleware in front of
  it) also accepts a Bearer token**, the way the existing
  `ANgroup/mobile` storefront app's SDK does, or this call will 401.
- `app.json`'s `extra.anApiUrl` etc. are placeholders — fill in real
  deployed URLs before running.
- No EAS project ID yet — run `eas init` once you're ready to build.

## Setup

```bash
npm install
npx expo start --dev-client
```
