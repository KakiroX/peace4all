"use client";

// Learner progress, persisted in the browser (localStorage).
// Everything the app knows about the learner lives here, so adding accounts/cloud
// sync later means swapping the `storage` below for a remote adapter.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getQuestion } from "@/lib/content";
import { topicKey } from "@/lib/subjects";
import { updateQuestionStat, updateTopicStat, type QuestionStat, type TopicStat } from "@/lib/mastery";
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

export interface ProgressData {
  topics: Record<string, TopicStat>;
  questions: Record<string, QuestionStat>;
  attempts: Attempt[];
  diagnostics: DiagnosticRecord[];
  settings: Settings;
}

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
}

export type ProgressState = ProgressData & ProgressActions;

const MAX_ATTEMPTS = 5000;
export const STORAGE_KEY = "ib-grind-progress";

export const DEFAULT_SETTINGS: Settings = { examDate: null, diagnosticDepth: 2, grindLength: 20 };

function initialData(): ProgressData {
  return { topics: {}, questions: {}, attempts: [], diagnostics: [], settings: { ...DEFAULT_SETTINGS } };
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

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetSubject: (subject) =>
        set((s) => ({
          topics: Object.fromEntries(Object.entries(s.topics).filter(([k]) => !k.startsWith(`${subject}:`))),
          questions: Object.fromEntries(Object.entries(s.questions).filter(([id]) => getQuestion(id)?.subject !== subject)),
          attempts: s.attempts.filter((a) => a.subject !== subject),
          diagnostics: s.diagnostics.filter((d) => d.subject !== subject),
        })),

      resetAll: () => set({ ...initialData() }),

      importData: (data) => {
        if (!isProgressData(data)) throw new Error("That file doesn't look like an IB Grind backup.");
        set({
          topics: data.topics,
          questions: data.questions,
          attempts: data.attempts,
          diagnostics: data.diagnostics,
          settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Hydrate manually after mount (see <StoreHydrator/>) to avoid SSR mismatches.
      skipHydration: true,
      partialize: (s): ProgressData => ({
        topics: s.topics,
        questions: s.questions,
        attempts: s.attempts,
        diagnostics: s.diagnostics,
        settings: s.settings,
      }),
    },
  ),
);

export function exportProgress(): ProgressData & { exportedAt: string; app: string } {
  const { topics, questions, attempts, diagnostics, settings } = useProgress.getState();
  return { app: "ib-grind", exportedAt: new Date().toISOString(), topics, questions, attempts, diagnostics, settings };
}
