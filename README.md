# AN Command

Unified mobile command center for AN group — one app for you and your team
to see and act on everything across the AN repos, instead of juggling each
service's own admin panel. This is **not** the customer-facing storefront
app (that's `ANgroup/mobile`) — this is the internal/admin app.

## Status: Phase 1 skeleton + ANu bot integration

What exists right now:
- Expo Router app shell with auth gate (`app/_layout.tsx`)
- Login screen wired to ANgroup's real `/api/auth/login` endpoint
  (`src/api/auth.ts`, `app/login.tsx`) — also persists the logged-in
  user's `activeBusinessId`, needed by ANu below.
- Tab shell: Dashboard / Assistants / Team Chat / Settings (`app/(tabs)/*`)
- Dashboard pulls ANgroup's `/api/dashboard/overview` (ERP metrics) —
  raw JSON rendering for now, needs real UI once confirmed working (see
  "ANgroup-side fix" below — same Bearer-auth gap applied here too).
- **Assistants tab is wired to ANu**, ANgroup's existing in-house AI
  assistant (`src/core/anu/anuService.ts` there — multi-provider,
  grounded in the business's enabled modules + its own knowledge base).
  This was already built for the web admin panel and for
  an-communications-platform (which reports through ANu via a
  `x-service-key` service identity) — this app is just a third client of
  the same `POST /api/anu` endpoint, not a new bot.
- **Service registry** (`src/config/services.ts`) — the extensibility
  point. Every backend this app talks to is one entry here (id, base URL
  env key, kind). Adding a future repo/service means adding one entry and
  its base URL in `app.json`'s `extra` — no other app code changes.
- **Assistant registry** (also in `src/config/services.ts`, `ASSISTANTS`)
  — same idea, one level down: every bot/assistant this app can talk to is
  one entry (id, label, which service it lives behind). ANu is the first;
  future bots (an-communications-platform's own, AN-Technologies', etc.)
  get added the same way — one registry entry + a thin client like
  `src/api/anu.ts` + a screen — instead of a new one-off integration each
  time.
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
- Additional bots beyond ANu — the registry supports them, none are wired
  up yet.
- Push notifications.
- Per-role permission gating in the app UI (ANgroup's backend already
  has a rich permission system — `isSuperAdmin`, `isPlatformStaff`,
  granted role permissions from login — the app should reflect it
  instead of assuming full access for anyone who can sign in).

## ANgroup-side fix that shipped alongside this

ANgroup's `src/middleware.ts` only ever read the `an_token` cookie to
authenticate requests — no mobile app (this one, or the existing
`ANgroup/mobile` storefront app, both Bearer-token-only since RN's
`fetch` has no cookie jar) could actually reach a single authenticated
route. Fixed by adding an `Authorization: Bearer` fallback in middleware
when the cookie is absent — the cookie path is unchanged for the web app.
See ANgroup's own commit on branch `claude/angroup-mobile-app-setup-djvmak`.

## Known gaps / things to verify before this is usable

- `app.json`'s `extra.anApiUrl` etc. are placeholders — fill in real
  deployed URLs before running.
- No EAS project ID yet — run `eas init` once you're ready to build.
- ANu's reply quality depends on ANgroup's `AIConfig` (Settings > AI)
  having a real provider key configured for the business — with none
  configured, `/api/anu` returns a friendly "not configured" error
  rather than a reply.

## Setup

```bash
npm install
npx expo start --dev-client
```
