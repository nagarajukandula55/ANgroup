# ANgroup Social — Desktop

Standalone Windows (also runs on Mac/Linux) app for managing every connected
social channel, generating content and avatars with AI, and running
auto-pilot posting/resharing — without opening the browser. This is a thin
client: all data, AI calls, and publishing logic live in the ANgroup backend
(`src/core/social/*`, `src/app/api/social/*`); this app just calls that API
over HTTPS, exactly like the browser does.

## How auth works

Electron's `session` persists cookies per-domain like a real browser. On
first launch you set the API base URL (your deployed ANgroup URL, e.g.
`https://angroup.in`) and sign in with your normal ANgroup credentials.
The login response's `Set-Cookie` is stored by Electron automatically, so
every subsequent `fetch(..., { credentials: 'include' })` call is
authenticated the same way the web app is — no separate token system to
maintain.

## Run in development

```bash
cd desktop
npm install
npm run electron:dev
```

This starts the Vite dev server and an Electron window pointed at it.

## Build a Windows installer

```bash
cd desktop
npm run build:win
```

Produces an NSIS installer in `desktop/release/` (electron-builder's
default output dir) that installs "ANgroup Social" as a native Windows app.

## What it manages

- **Channels** — connect multiple pages/accounts per platform (several
  Facebook Pages, several Instagram accounts, etc.), all under one business.
- **Compose** — write or AI-generate a caption/hashtags for a topic and
  platform, attach a brand avatar, publish now or schedule, to any
  combination of connected channels.
- **Avatar Studio** — generate an AI brand avatar image and set it as the
  default persona used by auto-generated posts.
- **Auto-pilot** — rules that generate and publish content on a cadence
  (hourly/daily/every 3 days/weekly) across chosen channels, and
  optionally reshare your own top-performing past posts (remixed with a
  fresh caption, never literally duplicated) after a cooldown — all
  organic, your own content only. No fake engagement, no bot traffic.
