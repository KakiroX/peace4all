// Question selection for the familiarization test (diagnostic) and the grinder.

import { topicKey } from "@/lib/subjects";
import {
  DIFFICULTY_OFFSET,
  estimateFromAnswers,
  isDue,
  masteryOf,
  type QuestionStat,
  type TopicStat,
} from "@/lib/mastery";
import type { Difficulty, Question, QuestionType, SubjectId } from "@/lib/types";

export type Rng = () => number;

const DAY = 24 * 60 * 60 * 1000;

export function weightedPick<T>(items: T[], weights: number[], rng: Rng = Math.random): T | undefined {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (items.length === 0) return undefined;
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Grinder

export type GrindMode = "weak" | "shuffle";

export interface GrindFilter {
  subjects: SubjectId[];
  /** Topic keys ("subject:topic"). Empty/undefined = all topics. */
  topics?: string[];
  difficulties?: Difficulty[];
  types?: QuestionType[];
}

export function filterPool(all: Question[], f: GrindFilter): Question[] {
  const topicSet = f.topics && f.topics.length > 0 ? new Set(f.topics) : null;
  return all.filter(
    (q) =>
      f.subjects.includes(q.subject) &&
      (!topicSet || topicSet.has(topicKey(q.subject, q.topic))) &&
      (!f.difficulties || f.difficulties.length === 0 || f.difficulties.includes(q.difficulty)) &&
      (!f.types || f.types.length === 0 || f.types.includes(q.type)),
  );
}

export interface PickContext {
  topicStats: Record<string, TopicStat>;
  questionStats: Record<string, QuestionStat>;
  /** Question ids served recently in this session, most recent last. */
  recent: string[];
  now: number;
  rng?: Rng;
}

/** How much the grinder wants to drill a topic: weak, untested and stale topics score high. */
export function topicWeight(stat: TopicStat | undefined, now: number, hasDue: boolean): number {
  const m = masteryOf(stat);
  let w = m === null ? 1 : Math.pow(1 - m, 1.5) + 0.08;
  if (stat && stat.n > 0) {
    const days = (now - stat.last) / DAY;
    w *= 1 + (Math.min(days, 21) / 21) * 0.75;
  }
  if (hasDue) w += 0.5;
  return w;
}

/** Prefer questions slightly below the learner's level (≈65-70% expected success). */
export function questionWeight(q: Question, theta: number, stat: QuestionStat | undefined, now: number): number {
  const target = Math.max(-1, Math.min(1, theta - 0.4));
  let w = Math.exp(-1.5 * Math.abs(DIFFICULTY_OFFSET[q.difficulty] - target));
  if (!stat) w *= 1.6;
  else if (isDue(stat, now)) w *= 2.5;
  else if (stat.lastScore >= 0.75) w *= 0.5;
  return w;
}

export function pickGrindQuestion(pool: Question[], mode: GrindMode, ctx: PickContext): Question | null {
  if (pool.length === 0) return null;
  const rng = ctx.rng ?? Math.random;
  const avoid = new Set(ctx.recent.slice(-Math.min(8, pool.length - 1)));
  const fresh = pool.filter((q) => !avoid.has(q.id));
  const candidates = fresh.length > 0 ? fresh : pool;

  if (mode === "shuffle") return candidates[Math.floor(rng() * candidates.length)];

  const byTopic = new Map<string, Question[]>();
  for (const q of candidates) {
    const key = topicKey(q.subject, q.topic);
    const list = byTopic.get(key) ?? [];
    list.push(q);
    byTopic.set(key, list);
  }
  const keys = [...byTopic.keys()];
  const weights = keys.map((k) =>
    topicWeight(
      ctx.topicStats[k],
      ctx.now,
      byTopic.get(k)!.some((q) => isDue(ctx.questionStats[q.id], ctx.now)),
    ),
  );
  const key = weightedPick(keys, weights, rng)!;
  const qs = byTopic.get(key)!;
  const theta = ctx.topicStats[key]?.theta ?? 0;
  return weightedPick(
    qs,
    qs.map((q) => questionWeight(q, theta, ctx.questionStats[q.id], ctx.now)),
    rng,
  )!;
}

// ---------------------------------------------------------------------------
// Familiarization test (adaptive diagnostic)

export interface DiagnosticPlan {
  subject: SubjectId;
  perTopic: number;
  /** Topic ids that have questions, in the order they'll be visited. */
  topics: string[];
}

export interface DiagnosticAnswer {
  questionId: string;
  topic: string;
  difficulty: Difficulty;
  score: number;
  marks: number;
  marksAwarded: number;
  skipped: boolean;
}

export function createDiagnosticPlan(
  subject: SubjectId,
  bank: Question[],
  perTopic: number,
  rng: Rng = Math.random,
): DiagnosticPlan {
  const topics = [...new Set(bank.filter((q) => q.subject === subject).map((q) => q.topic))];
  return { subject, perTopic, topics: shuffle(topics, rng) };
}

export function diagnosticLength(plan: DiagnosticPlan, bank: Question[]): number {
  return plan.topics.reduce(
    (sum, t) => sum + Math.min(plan.perTopic, bank.filter((q) => q.subject === plan.subject && q.topic === t).length),
    0,
  );
}

/**
 * Next question in the diagnostic. Topics are visited round-robin; within a topic the
 * first question is medium, then it steps up after a good answer and down after a poor one.
 */
export function nextDiagnosticQuestion(
  plan: DiagnosticPlan,
  bank: Question[],
  answers: DiagnosticAnswer[],
  rng: Rng = Math.random,
): Question | null {
  const used = new Set(answers.map((a) => a.questionId));
  const counts = new Map<string, number>();
  for (const a of answers) counts.set(a.topic, (counts.get(a.topic) ?? 0) + 1);

  const open = plan.topics.filter(
    (t) =>
      (counts.get(t) ?? 0) < plan.perTopic &&
      bank.some((q) => q.subject === plan.subject && q.topic === t && !used.has(q.id)),
  );
  if (open.length === 0) return null;

  const minCount = Math.min(...open.map((t) => counts.get(t) ?? 0));
  const topic = open.find((t) => (counts.get(t) ?? 0) === minCount)!;

  const previous = answers.filter((a) => a.topic === topic);
  let target: number = 2;
  if (previous.length > 0) {
    const last = previous[previous.length - 1];
    target = last.score >= 0.75 ? last.difficulty + 1 : last.score < 0.4 ? last.difficulty - 1 : last.difficulty;
  }
  const options = bank.filter((q) => q.subject === plan.subject && q.topic === topic && !used.has(q.id));
  const best = Math.min(...options.map((q) => Math.abs(q.difficulty - target)));
  const closest = options.filter((q) => Math.abs(q.difficulty - target) === best);
  return closest[Math.floor(rng() * closest.length)];
}

export interface TopicResult {
  topic: string;
  n: number;
  marks: number;
  marksAwarded: number;
  /** Mastery estimate from this test alone (0..1). */
  estimate: number;
}

export function summarizeDiagnostic(answers: DiagnosticAnswer[]): {
  topics: TopicResult[];
  marks: number;
  marksAwarded: number;
} {
  const groups = new Map<string, DiagnosticAnswer[]>();
  for (const a of answers) groups.set(a.topic, [...(groups.get(a.topic) ?? []), a]);
  const topics: TopicResult[] = [...groups.entries()].map(([topic, list]) => ({
    topic,
    n: list.length,
    marks: list.reduce((s, a) => s + a.marks, 0),
    marksAwarded: list.reduce((s, a) => s + a.marksAwarded, 0),
    estimate: estimateFromAnswers(list) ?? 0,
  }));
  topics.sort((a, b) => a.estimate - b.estimate);
  return {
    topics,
    marks: topics.reduce((s, t) => s + t.marks, 0),
    marksAwarded: topics.reduce((s, t) => s + t.marksAwarded, 0),
  };
}
