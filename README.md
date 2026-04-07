# Code Cracking

Realtime multiplayer code-cracking game built with:
- React + Vite + TypeScript
- Tailwind CSS
- Firebase Realtime Database (Spark free tier)
- Firebase Authentication (Anonymous + Google)
- Firebase App Check (MT-Captcha via custom provider)
- PWA (installable)

## Features

- Profile setup with username + avatar
- Lobby with open rooms
- Public or private rooms (optional password)
- Invite link sharing (`?room=<id>`)
- Anonymous-by-default sessions
- Optional Google login from welcome screen
- Rock/Paper/Scissors to decide first turn
- Configurable code length (1 to 5)
- Optional duplicate digits
- Turn-based guessing with full history
- Auto lie detection (claimed result vs actual result)
- Penalty system (3 penalties = auto loss)
- PWA install support with offline-ready and update notifications

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Create a Firebase project and enable:
  - Realtime Database (Spark/free plan)
  - Authentication -> Anonymous
  - Authentication -> Google
4. Fill all `VITE_FIREBASE_*` values in `.env` from your Firebase Web app config.
5. For App Check with MT-Captcha, also set:
  - `VITE_APPCHECK_MTCAPTCHA_SITE_KEY`
  - `VITE_APPCHECK_EXCHANGE_ENDPOINT` (your backend endpoint that validates MT-Captcha and returns a Firebase App Check token)

If App Check env vars are not present, App Check initialization is skipped (useful in local development).

## Run

```bash
pnpm dev
```

## Build

```bash
pnpm build
pnpm preview
```

## PWA Notes

- Installable on mobile and desktop from browser install prompts.
- App shell and key static assets are cached for offline startup.
- You will see an in-app toast when:
  - Offline mode is ready.
  - A new app version is available (with a refresh action).
- Useful routes for PWA shortcuts:
  - `/welcome`
  - `/rooms`

## Firebase Realtime Database Rules (example for testing)

Use these during development (tighten before production):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
