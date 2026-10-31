// Topic mastery model.
//
// Each topic has an ability estimate `theta` on a logit scale. A question of
// difficulty d has offset b(d) ∈ {-1, 0, +1}; the expected score is σ(θ − b).
// After each answer we nudge θ towards the observed score (Elo-style), with a
// step size that shrinks as evidence accumulates. "Mastery" is the probability
// of scoring on a medium question: σ(θ).

import type { Difficulty } from "@/lib/types";

export interface TopicStat {
  theta: number;
  /** Number of answers seen for this topic. */
  n: number;
  /** Sum of scores (0..1 each), for raw accuracy. */
  scoreSum: number;
  /** Timestamp of the most recent answer. */
  last: number;
}

export const DIFFICULTY_OFFSET: Record<Difficulty, number> = { 1: -1, 2: 0, 3: 1 };
const THETA_LIMIT = 4;

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function expectedScore(theta: number, difficulty: Difficulty): number {
  return sigmoid(theta - DIFFICULTY_OFFSET[difficulty]);
}

export function stepSize(n: number): number {
  return Math.max(0.35, 2 / (1 + 0.5 * n));
}

export function emptyTopicStat(): TopicStat {
  return { theta: 0, n: 0, scoreSum: 0, last: 0 };
}

export function updateTopicStat(
  prev: TopicStat | undefined,
  score: number,
  difficulty: Difficulty,
  at: number,
): TopicStat {
  const s = prev ?? emptyTopicStat();
  const p = expectedScore(s.theta, difficulty);
  const theta = Math.max(-THETA_LIMIT, Math.min(THETA_LIMIT, s.theta + stepSize(s.n) * (score - p)));
  return { theta, n: s.n + 1, scoreSum: s.scoreSum + score, last: at };
}

/** 0..1, or null when the topic hasn't been tested yet. */
export function masteryOf(stat: TopicStat | undefined): number | null {
  if (!stat || stat.n === 0) return null;
  return sigmoid(stat.theta);
}

/** Estimate mastery from a list of answers alone (used for diagnostic reports). */
export function estimateFromAnswers(answers: { score: number; difficulty: Difficulty }[]): number | null {
  let stat: TopicStat | undefined;
  for (const a of answers) stat = updateTopicStat(stat, a.score, a.difficulty, 0);
  return masteryOf(stat);
}

export type Band = "untested" | "weak" | "shaky" | "solid" | "mastered";

export const BAND_THRESHOLDS = { shaky: 0.4, solid: 0.65, mastered: 0.85 } as const;

export function bandOf(mastery: number | null): Band {
  if (mastery === null) return "untested";
  if (mastery < BAND_THRESHOLDS.shaky) return "weak";
  if (mastery < BAND_THRESHOLDS.solid) return "shaky";
  if (mastery < BAND_THRESHOLDS.mastered) return "solid";
  return "mastered";
}

export const BAND_LABEL: Record<Band, string> = {
  untested: "Untested",
  weak: "Weak",
  shaky: "Shaky",
  solid: "Solid",
  mastered: "Mastered",
};

/** Is this a weak spot worth grinding? */
export function isWeak(mastery: number | null): boolean {
  return mastery !== null && mastery < BAND_THRESHOLDS.solid;
}

// ---------------------------------------------------------------------------
// Per-question spaced repetition (Leitner boxes).

export interface QuestionStat {
  box: number;
  n: number;
  lastScore: number;
  last: number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Review interval for each Leitner box. */
export const BOX_INTERVALS = [10 * MINUTE, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];

export function updateQuestionStat(prev: QuestionStat | undefined, score: number, at: number): QuestionStat {
  const box = score >= 0.75 ? Math.min((prev?.box ?? 0) + 1, BOX_INTERVALS.length - 1) : 0;
  return { box, n: (prev?.n ?? 0) + 1, lastScore: score, last: at };
}

export function isDue(stat: QuestionStat | undefined, now: number): boolean {
  if (!stat) return false;
  return now - stat.last >= BOX_INTERVALS[stat.box];
}
