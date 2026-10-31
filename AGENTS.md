<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (IB Grind)

- Web app for IB prep: Physics HL, Math AA HL, Chemistry SL, Business Management SL. Hosted on Vercel;
  accounts + data on Firebase (Auth with Google, Firestore). Deploy steps: `DEPLOY.md`.
- Content: syllabi in `content/subjects/*.ts`, question banks in `content/questions/*.json`. Format: `content/README.md`.
- Engine lives in `lib/` (pure functions, unit-tested in `tests/`). UI in `components/`; route files in `app/` stay thin.
- Learner state lives in the browser (Zustand + localStorage, `lib/store.ts`), hydrated after mount. Gate UI on `useHydrated()`.
  Signed-in users are mirrored to Firestore by `lib/sync.ts` (lazy-loaded; never import it statically).
  Attempts are the source of truth; topic/question stats are derived (`deriveStats` in `lib/merge.ts`).
  New synced fields must be added to `SyncedData`, `mergeSynced`, `parseRemote`/`writeProfile` and `firestore.rules`.
- Firebase config: env `NEXT_PUBLIC_FIREBASE_*` or `COMMITTED_CONFIG` in `lib/firebase-config.ts` (public values).
  Unset = local-only mode. Test sync locally with `npm run emulators` + the emulator block in `.env.example`.
  Don't call `Date.now()`/`Math.random()` during render (lint + Cache Components prerender reject it); use `useNow()` or event handlers.
- Before committing: `npm run check && npm run build`.
