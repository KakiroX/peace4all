// Pure helpers for combining progress from several devices.
//
// Attempts (answers) are the source of truth: they are append-only and uniquely keyed,
// so merging two devices is a set union. Topic mastery and spaced-repetition state are
// *derived* by replaying attempts in time order, so every device computes the same numbers.

import { getQuestion } from "@/lib/content";
import { updateQuestionStat, updateTopicStat, type QuestionStat, type TopicStat } from "@/lib/mastery";
import { dayKey } from "@/lib/stats";
import { topicKey } from "@/lib/subjects";
import type { SyncedData } from "@/lib/store";
import type { Attempt, Difficulty } from "@/lib/types";

export function attemptKey(a: Pick<Attempt, "at" | "questionId">): string {
  return `${a.at}:${a.questionId}`;
}

export function mergeAttempts(...lists: Attempt[][]): Attempt[] {
  const byKey = new Map<string, Attempt>();
  for (const list of lists) for (const a of list) byKey.set(attemptKey(a), a);
  return [...byKey.values()].sort((a, b) => a.at - b.at);
}

export function mergeById<T extends { id: string }>(sortBy: (x: T) => number, ...lists: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const list of lists) for (const x of list) byId.set(x.id, x);
  return [...byId.values()].sort((a, b) => sortBy(a) - sortBy(b));
}

/** Rebuild topic mastery + per-question review state from the answer history. */
export function deriveStats(attempts: Attempt[]): {
  topics: Record<string, TopicStat>;
  questions: Record<string, QuestionStat>;
} {
  const topics: Record<string, TopicStat> = {};
  const questions: Record<string, QuestionStat> = {};
  const sorted = [...attempts].sort((a, b) => a.at - b.at);
  for (const a of sorted) {
    // Difficulty comes from the current bank; questions removed since count as medium.
    const difficulty: Difficulty = getQuestion(a.questionId)?.difficulty ?? 2;
    const key = topicKey(a.subject, a.topic);
    topics[key] = updateTopicStat(topics[key], a.score, difficulty, a.at);
    questions[a.questionId] = updateQuestionStat(questions[a.questionId], a.score, a.at);
  }
  return { topics, questions };
}

/** Attempts present in `next` but not in `prev`. Fast path for the usual single append. */
export function newAttempts(prev: Attempt[], next: Attempt[]): Attempt[] {
  if (prev === next) return [];
  const last = next[next.length - 1];
  const appendedOne =
    next.length > 0 &&
    (prev.length === 0
      ? next.length === 1
      : next[next.length - 2] === prev[prev.length - 1] && (next.length === prev.length + 1 || next.length === prev.length));
  if (appendedOne) return [last];
  const seen = new Set(prev.map(attemptKey));
  return next.filter((a) => !seen.has(attemptKey(a)));
}

/** Drop attempts/diagnostics hidden by reset markers ("everything before T was reset"). */
export function applyResets<T extends SyncedData>(data: T): T {
  const cutoff = (subject: Attempt["subject"]) => Math.max(data.resets.all ?? 0, data.resets[subject] ?? 0);
  return {
    ...data,
    attempts: data.attempts.filter((a) => a.at > cutoff(a.subject)),
    diagnostics: data.diagnostics.filter((d) => d.finishedAt > cutoff(d.subject)),
  };
}

/** Did any reset marker move forward (i.e. something new must be deleted)? */
export function resetsAdvanced(prev: SyncedData["resets"], next: SyncedData["resets"]): boolean {
  return Object.entries(next).some(([k, v]) => (v ?? 0) > (prev[k as keyof typeof prev] ?? 0));
}

export interface MergeResult {
  data: SyncedData;
  /** Attempts the server doesn't have yet. */
  uploadAttempts: Attempt[];
  /** Settings/resets/diagnostics on this device are newer than the server's. */
  uploadProfile: boolean;
  /** The server holds data that a reset says should be gone: rewrite it from local. */
  remoteNeedsRewrite: boolean;
}

/**
 * Combine this device's data with the server's. Answers and test results are unioned;
 * settings and reset markers are last-writer-wins by their timestamps.
 */
export function mergeSynced(local: SyncedData, remote: SyncedData): MergeResult {
  const settingsFrom = remote.settingsUpdatedAt > local.settingsUpdatedAt ? remote : local;
  const resetsFrom = remote.resetsUpdatedAt > local.resetsUpdatedAt ? remote : local;
  const data = applyResets({
    attempts: mergeAttempts(local.attempts, remote.attempts),
    diagnostics: mergeById((d) => d.finishedAt, local.diagnostics, remote.diagnostics),
    settings: settingsFrom.settings,
    settingsUpdatedAt: settingsFrom.settingsUpdatedAt,
    resets: resetsFrom.resets,
    resetsUpdatedAt: resetsFrom.resetsUpdatedAt,
  });

  const remoteKeys = new Set(remote.attempts.map(attemptKey));
  const keptKeys = new Set(data.attempts.map(attemptKey));
  const remoteDiagIds = new Set(remote.diagnostics.map((d) => d.id));
  const keptDiagIds = new Set(data.diagnostics.map((d) => d.id));

  return {
    data,
    uploadAttempts: data.attempts.filter((a) => !remoteKeys.has(attemptKey(a))),
    uploadProfile:
      local.settingsUpdatedAt > remote.settingsUpdatedAt ||
      local.resetsUpdatedAt > remote.resetsUpdatedAt ||
      data.diagnostics.some((d) => !remoteDiagIds.has(d.id)),
    remoteNeedsRewrite:
      remote.attempts.some((a) => !keptKeys.has(attemptKey(a))) || remote.diagnostics.some((d) => !keptDiagIds.has(d.id)),
  };
}

/** Group attempts by local calendar day (used as Firestore document ids). */
export function groupByDay(attempts: Attempt[]): Map<string, Attempt[]> {
  const days = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const key = dayKey(a.at);
    const list = days.get(key) ?? [];
    list.push(a);
    days.set(key, list);
  }
  return days;
}
