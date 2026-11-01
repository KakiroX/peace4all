// Core domain types for IB Grind.
// Content (syllabi + questions) lives in /content and is validated against these
// shapes by `npm run validate:content`.

export const SUBJECT_IDS = ["physics-hl", "math-aa-hl", "chem-sl", "bm-sl"] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];

export type Level = "HL" | "SL";

export interface Unit {
  /** Short id, unique within the subject, e.g. "A" or "unit-3". */
  id: string;
  name: string;
}

export interface Topic {
  /** Unique within the subject, e.g. "A.1", "S1.4", "3.5", "calc-int". */
  id: string;
  /** Unit this topic belongs to (Unit.id). */
  unit: string;
  /** Code shown in the UI, e.g. "A.1". */
  code: string;
  name: string;
  /** Additional higher level (AHL) content. */
  ahl?: boolean;
  /** Free-text list of the syllabus points the topic covers (shown as a hint). */
  covers?: string[];
}

export interface Paper {
  id: string;
  name: string;
  description: string;
}

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  level: Level;
  /** Categorical slot (1-4) used for the subject's identity colour. */
  colorSlot: 1 | 2 | 3 | 4;
  units: Unit[];
  topics: Topic[];
  papers: Paper[];
  /** Default relative tolerance for numeric answers (0.01 = 1%). */
  numericTolerance: number;
}

export type Difficulty = 1 | 2 | 3;

interface QuestionBase {
  id: string;
  subject: SubjectId;
  /** Topic.id within the subject. */
  topic: string;
  difficulty: Difficulty;
  marks: number;
  /** Markdown with $inline$ and $$display$$ LaTeX. */
  prompt: string;
  /** Worked solution / explanation shown after answering (markdown + LaTeX). */
  explanation?: string;
  /** Paper the question is styled after, e.g. "P1", "P2". */
  paper?: string;
  calculator?: boolean;
  /** Where the question came from, e.g. "Sample" or "M23 TZ1 P2 Q4". */
  source?: string;
  tags?: string[];
}

/** Multiple choice: one correct option. */
export interface McqQuestion extends QuestionBase {
  type: "mcq";
  options: string[];
  /** Index into `options`. */
  answer: number;
}

/** Numeric answer, auto-marked within a tolerance. */
export interface NumericQuestion extends QuestionBase {
  type: "numeric";
  answer: number;
  /** Relative tolerance, overrides the subject default. */
  tolerance?: number;
  /** Absolute tolerance (used instead of relative when set). */
  absTolerance?: number;
  units?: string;
}

/** Written / structured answer, self-marked against a markscheme. */
export interface WrittenQuestion extends QuestionBase {
  type: "written";
  markscheme: string;
}

export type Question = McqQuestion | NumericQuestion | WrittenQuestion;
export type QuestionType = Question["type"];

/** What the learner submitted for a question. */
export type Response =
  | { kind: "mcq"; choice: number }
  | { kind: "numeric"; raw: string }
  | { kind: "written"; text: string; awarded: number }
  | { kind: "skip" };

export interface GradeResult {
  /** 0..1 */
  score: number;
  correct: boolean;
  marksAwarded: number;
  /** Human-readable note, e.g. "Could not read that number". */
  note?: string;
}

export type AttemptMode = "diagnostic" | "grind";

export interface Attempt {
  questionId: string;
  subject: SubjectId;
  topic: string;
  score: number;
  marksAwarded: number;
  marks: number;
  skipped: boolean;
  mode: AttemptMode;
  timeMs: number;
  at: number;
}
