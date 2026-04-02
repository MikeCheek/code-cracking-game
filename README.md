# Code Cracking

Realtime multiplayer code-cracking game built with:
- React + Vite + TypeScript
- Tailwind CSS
- Firebase Realtime Database (Spark free tier)
- PWA (installable)

## Features

- Profile setup with username + avatar
- Lobby with open rooms
- Public or private rooms (optional password)
- Invite link sharing (`?room=<id>`)
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

3. Create a Firebase project and enable Realtime Database (Spark/free plan).
4. Fill all `VITE_FIREBASE_*` values in `.env` from your Firebase Web app config.

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
