# IB Grind

A web app for IB exam prep in **Physics HL**, **Math AA HL**, **Chemistry SL** and **Business Management SL**.

- **Familiarization test**: an adaptive diagnostic across a subject's whole syllabus. Each topic starts with a medium question, then steps up or down based on your answer. It ends with a ranked list of weak spots and a one-click "Grind weak spots" button.
- **Grinder**: endless adaptive practice. It picks topics weighted towards low-mastery, untested and stale ones, targets questions just below your level, re-serves missed questions a few questions later, and uses spaced repetition (Leitner boxes) across sessions. You can focus on chosen topics, difficulty or question types, or mix all subjects.
- **Progress**: a topic map per subject coloured by mastery band (Weak / Shaky / Solid / Mastered), daily activity, accuracy and time spent.
- **Dashboard**: streak, today's count, top weak spots across subjects and an exam countdown.
- **Accounts & sync**: "Sign in with Google" saves progress to your account (Firebase) and syncs it across devices. Without sign-in, the app works fully offline in the browser.
- Question types: **multiple choice**, **numeric** (auto-marked with tolerance; accepts `3.2e5`, `3.2×10^5`, `7/9`, `3e`, `sqrt(3)/2`, trailing units) and **written** (self-marked against the markscheme). Markdown + LaTeX everywhere.

> **Status: shell.** Every feature works end to end, but the question bank holds only ~45 placeholder questions (`"source": "Sample"`). Real material goes in next; see [`content/README.md`](content/README.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zustand · KaTeX · Firebase (Auth + Firestore) · Vitest. Hosted on Vercel.

### Accounts and sync

- Progress always lives in the browser first (`lib/store.ts`, localStorage), so the app is instant and works offline.
- When signed in, `lib/sync.ts` mirrors it to Firestore: `users/{uid}` holds settings, reset markers and familiarization-test results, and `users/{uid}/days/{date}` holds that day's answers. Each answer is one write.
- Merging is conflict-free (`lib/merge.ts`). Answers are append-only and unioned across devices. Mastery and spaced-repetition state are **recomputed from the answer history**, so every device shows the same numbers. Settings are last-writer-wins, and resets travel as "everything before time T" markers.
- `firestore.rules` restricts every user to their own documents.
- The Firebase SDK is only downloaded when Firebase is configured. Without a config, the app runs local-only, with backup/restore in Settings.

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000 (local-only mode, no Firebase needed)
```

To work on sign-in and sync locally, without a real Firebase project:

```bash
npm run emulators  # Firebase Auth + Firestore emulators (needs Java 11+)
# copy the emulator block from .env.example into .env.local, then:
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run check` | Content validation + typecheck + lint + unit tests |
| `npm run validate:content` | Validate the syllabi and question banks only |
| `npm test` | Unit tests (grading, answer parsing, mastery model, selection, sync merging) |
| `npm run emulators` | Local Firebase Auth + Firestore emulators |

## Deploying

**Step-by-step guide: [DEPLOY.md](DEPLOY.md).** In short: create a Firebase project (free plan), turn on Google sign-in and Firestore, publish `firestore.rules`, import the repo into Vercel with the Firebase web config, and add the Vercel domain to Firebase's authorised domains. After that, every push to the production branch redeploys.

## Project layout

```
app/                 Routes: dashboard, /diagnostic, /grind, /progress, /settings, /subjects/[subject]
components/          UI (QuestionCard, DiagnosticRunner, Grinder, ProgressView, …)
content/subjects/    Syllabus per subject (units + topics)
content/questions/   Question bank per subject (JSON)
lib/                 Engine: grading, answer parser, mastery model, selection, store, stats,
                     sync (Firebase), merge (pure cross-device merging)
scripts/             Content validator
tests/               Vitest unit tests
firestore.rules      Database security rules (paste into Firebase console)
DEPLOY.md            How to put it online
```

## How the scoring works

Each topic has an ability estimate θ on a logit scale. A question of difficulty easy/medium/hard has offset −1/0/+1, and the expected score is σ(θ − offset). After each answer θ moves towards the observed score (Elo-style), with a step size that shrinks as evidence builds up. **Mastery** is σ(θ): the estimated chance of scoring on a medium question in that topic. Bands: Weak < 40% ≤ Shaky < 65% ≤ Solid < 85% ≤ Mastered.
