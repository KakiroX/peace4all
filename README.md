# IB Grind

A web app for IB exam prep in **Physics HL**, **Math AA HL**, **Chemistry SL** and **Business Management SL**.

- **Familiarization test**: an adaptive diagnostic across a subject's whole syllabus. Each topic starts with a medium question, then steps up or down based on your answer. It ends with a ranked list of weak spots and a one-click "Grind weak spots" button.
- **Grinder**: endless adaptive practice. It picks topics weighted towards low-mastery, untested and stale ones, targets questions just below your level, re-serves missed questions a few questions later, and uses spaced repetition (Leitner boxes) across sessions. You can focus on chosen topics, difficulty or question types, or mix all subjects.
- **Progress**: a topic map per subject coloured by mastery band (Weak / Shaky / Solid / Mastered), daily activity, accuracy and time spent.
- **Dashboard**: streak, today's count, top weak spots across subjects and an exam countdown.
- Question types: **multiple choice**, **numeric** (auto-marked with tolerance; accepts `3.2e5`, `3.2×10^5`, `7/9`, `3e`, `sqrt(3)/2`, trailing units) and **written** (self-marked against the markscheme). Markdown + LaTeX everywhere.

> **Status: shell.** Every feature works end to end, but the question bank holds only ~45 placeholder questions (`"source": "Sample"`). Real material goes in next; see [`content/README.md`](content/README.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zustand · KaTeX · Vitest.

Progress is stored in the browser (localStorage), with backup/restore in Settings. All learner state goes through `lib/store.ts`, so adding accounts and cloud sync later means swapping its storage adapter.

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run check` | Content validation + typecheck + lint + unit tests |
| `npm run validate:content` | Validate the syllabi and question banks only |
| `npm test` | Unit tests (grading, answer parsing, mastery model, selection) |

## Deploying

It's a standard Next.js app, so it deploys to **Vercel** with zero config: import the repo at vercel.com/new and every push to the production branch goes live. `vercel.json` pins the region to `fra1`. Any Node host that runs `npm run build && npm start` also works.

## Project layout

```
app/                 Routes: dashboard, /diagnostic, /grind, /progress, /settings, /subjects/[subject]
components/          UI (QuestionCard, DiagnosticRunner, Grinder, ProgressView, …)
content/subjects/    Syllabus per subject (units + topics)
content/questions/   Question bank per subject (JSON)
lib/                 Engine: grading, answer parser, mastery model, selection, store, stats
scripts/             Content validator
tests/               Vitest unit tests
```

## How the scoring works

Each topic has an ability estimate θ on a logit scale. A question of difficulty easy/medium/hard has offset −1/0/+1, and the expected score is σ(θ − offset). After each answer θ moves towards the observed score (Elo-style), with a step size that shrinks as evidence builds up. **Mastery** is σ(θ): the estimated chance of scoring on a medium question in that topic. Bands: Weak < 40% ≤ Shaky < 65% ≤ Solid < 85% ≤ Mastered.
