"use client";

// Learner progress, persisted in the browser (localStorage).
// When signed in, lib/sync.ts mirrors it to Firestore and merges other devices' data in.
// Answers (attempts) are the source of truth; topic/question stats are derived from them.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getQuestion } from "@/lib/content";
import { topicKey } from "@/lib/subjects";
import { updateQuestionStat, updateTopicStat, type QuestionStat, type TopicStat } from "@/lib/mastery";
import { deriveStats, mergeAttempts, mergeById } from "@/lib/merge";
import type { Attempt, AttemptMode, GradeResult, Question, SubjectId } from "@/lib/types";
import type { TopicResult } from "@/lib/selection";

export interface DiagnosticRecord {
  id: string;
  subject: SubjectId;
  startedAt: number;
  finishedAt: number;
  depth: number;
  questions: number;
  marks: number;
  marksAwarded: number;
  topics: TopicResult[];
}

export interface Settings {
  /** ISO date (YYYY-MM-DD) of the first exam, for the countdown. */
  examDate: string | null;
  /** Questions per topic in the familiarization test. */
  diagnosticDepth: 1 | 2 | 3;
  /** Questions per grind session; 0 = endless. */
  grindLength: number;
}

/** "Everything before time T was reset", per subject or for all subjects. */
export type ResetMarkers = Partial<Record<SubjectId | "all", number>>;

export interface ProgressData {
  topics: Record<string, TopicStat>;
  questions: Record<string, QuestionStat>;
  attempts: Attempt[];
  diagnostics: DiagnosticRecord[];
  settings: Settings;
  settingsUpdatedAt: number;
  resets: ResetMarkers;
  resetsUpdatedAt: number;
  /** Firebase uid this local data belongs to (null = not linked to an account). */
  ownerUid: string | null;
}

/** The parts of progress that are synced; topics/questions are derived from attempts. */
export type SyncedData = Pick<
  ProgressData,
  "attempts" | "diagnostics" | "settings" | "settingsUpdatedAt" | "resets" | "resetsUpdatedAt"
>;

interface ProgressActions {
  recordAttempt: (
    q: Question,
    g: GradeResult,
    meta: { mode: AttemptMode; timeMs: number; skipped: boolean },
  ) => void;
  saveDiagnostic: (record: DiagnosticRecord) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSubject: (subject: SubjectId) => void;
  resetAll: () => void;
  importData: (data: unknown) => void;
  /** Used by sync: replace synced data (stats are re-derived). */
  applySynced: (data: SyncedData & { ownerUid: string | null }) => void;
  /** Wipe local data entirely (e.g. on sign-out). */
  clearLocal: () => void;
}

export type ProgressState = ProgressData & ProgressActions;

// Local cap (~3-4 MB of localStorage). Synced copies in Firestore are not capped.
const MAX_ATTEMPTS = 20000;
export const STORAGE_KEY = "ib-grind-progress";

export const DEFAULT_SETTINGS: Settings = { examDate: null, diagnosticDepth: 2, grindLength: 20 };

function initialData(): ProgressData {
  return {
    topics: {},
    questions: {},
    attempts: [],
    diagnostics: [],
    settings: { ...DEFAULT_SETTINGS },
    settingsUpdatedAt: 0,
    resets: {},
    resetsUpdatedAt: 0,
    ownerUid: null,
  };
}

function isProgressData(x: unknown): x is ProgressData {
  if (!x || typeof x !== "object") return false;
  const d = x as Record<string, unknown>;
  return (
    typeof d.topics === "object" &&
    typeof d.questions === "object" &&
    Array.isArray(d.attempts) &&
    Array.isArray(d.diagnostics)
  );
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      ...initialData(),

      recordAttempt: (q, g, meta) =>
        set((s) => {
          const at = Date.now();
          const key = topicKey(q.subject, q.topic);
          const attempt: Attempt = {
            questionId: q.id,
            subject: q.subject,
            topic: q.topic,
            score: g.score,
            marksAwarded: g.marksAwarded,
            marks: q.marks,
            skipped: meta.skipped,
            mode: meta.mode,
            timeMs: meta.timeMs,
            at,
          };
          return {
            topics: { ...s.topics, [key]: updateTopicStat(s.topics[key], g.score, q.difficulty, at) },
            questions: { ...s.questions, [q.id]: updateQuestionStat(s.questions[q.id], g.score, at) },
            attempts: [...s.attempts, attempt].slice(-MAX_ATTEMPTS),
          };
        }),

      saveDiagnostic: (record) => set((s) => ({ diagnostics: [...s.diagnostics, record] })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch }, settingsUpdatedAt: Date.now() })),

      resetSubject: (subject) =>
        set((s) => {
          const now = Date.now();
          return {
            topics: Object.fromEntries(Object.entries(s.topics).filter(([k]) => !k.startsWith(`${subject}:`))),
            questions: Object.fromEntries(Object.entries(s.questions).filter(([id]) => getQuestion(id)?.subject !== subject)),
            attempts: s.attempts.filter((a) => a.subject !== subject),
            diagnostics: s.diagnostics.filter((d) => d.subject !== subject),
            resets: { ...s.resets, [subject]: now },
            resetsUpdatedAt: now,
          };
        }),

      resetAll: () =>
        set((s) => {
          const now = Date.now();
          return {
            ...initialData(),
            settingsUpdatedAt: now,
            resets: { ...s.resets, all: now },
            resetsUpdatedAt: now,
            ownerUid: s.ownerUid,
          };
        }),

      // Restoring a backup merges it in (never deletes anything) and lifts earlier resets
      // so the restored answers are visible again.
      importData: (data) => {
        if (!isProgressData(data)) throw new Error("That file doesn't look like an IB Grind backup.");
        set((s) => {
          const now = Date.now();
          const attempts = mergeAttempts(s.attempts, data.attempts).slice(-MAX_ATTEMPTS);
          return {
            ...deriveStats(attempts),
            attempts,
            diagnostics: mergeById((d) => d.finishedAt, s.diagnostics, data.diagnostics),
            settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
            settingsUpdatedAt: now,
            resets: {},
            resetsUpdatedAt: now,
          };
        });
      },

      applySynced: (data) =>
        set(() => {
          const attempts = data.attempts.slice(-MAX_ATTEMPTS);
          return { ...data, attempts, ...deriveStats(attempts) };
        }),

      clearLocal: () => set({ ...initialData() }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<ProgressData>;
        if (version < 2) return { ...initialData(), ...old } as ProgressData;
        return old as ProgressData;
      },
      // Hydrate manually after mount (see useRehydrateOnMount) to avoid SSR mismatches.
      skipHydration: true,
      partialize: (s): ProgressData => ({
        topics: s.topics,
        questions: s.questions,
        attempts: s.attempts,
        diagnostics: s.diagnostics,
        settings: s.settings,
        settingsUpdatedAt: s.settingsUpdatedAt,
        resets: s.resets,
        resetsUpdatedAt: s.resetsUpdatedAt,
        ownerUid: s.ownerUid,
      }),
    },
  ),
);

export function exportProgress() {
  const { topics, questions, attempts, diagnostics, settings } = useProgress.getState();
  return { app: "ib-grind", exportedAt: new Date().toISOString(), topics, questions, attempts, diagnostics, settings };
}

/** Resolves once saved progress has been loaded from localStorage. */
export function whenHydrated(): Promise<void> {
  if (useProgress.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useProgress.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
