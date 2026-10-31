import { parseNumericAnswer } from "@/lib/expr";
import { getSubject } from "@/lib/subjects";
import type { GradeResult, NumericQuestion, Question, Response } from "@/lib/types";

/** Within tolerance of the expected numeric answer? */
export function numericMatches(q: NumericQuestion, value: number): boolean {
  const diff = Math.abs(value - q.answer);
  if (q.absTolerance !== undefined) return diff <= q.absTolerance + 1e-12;
  const rel = q.tolerance ?? getSubject(q.subject).numericTolerance;
  if (q.answer === 0) return diff <= 1e-9;
  return diff <= rel * Math.abs(q.answer) + 1e-12;
}

export function grade(q: Question, r: Response): GradeResult {
  if (r.kind === "skip") return { score: 0, correct: false, marksAwarded: 0 };

  switch (q.type) {
    case "mcq": {
      if (r.kind !== "mcq") break;
      const correct = r.choice === q.answer;
      return { score: correct ? 1 : 0, correct, marksAwarded: correct ? q.marks : 0 };
    }
    case "numeric": {
      if (r.kind !== "numeric") break;
      const value = parseNumericAnswer(r.raw);
      if (value === null) {
        return { score: 0, correct: false, marksAwarded: 0, note: "Couldn't read that as a number." };
      }
      const correct = numericMatches(q, value);
      return { score: correct ? 1 : 0, correct, marksAwarded: correct ? q.marks : 0 };
    }
    case "written": {
      if (r.kind !== "written") break;
      const awarded = Math.max(0, Math.min(q.marks, Math.round(r.awarded)));
      const score = q.marks > 0 ? awarded / q.marks : 0;
      return { score, correct: score >= 0.75, marksAwarded: awarded };
    }
  }
  throw new Error(`Response of kind "${r.kind}" doesn't match question type "${q.type}"`);
}

/** Format a number the way a markscheme would (up to 4 significant figures). */
export function formatAnswer(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e5 || abs < 1e-3) {
    const [m, e] = value.toExponential(3).split("e");
    return `${parseFloat(m)} × 10^${parseInt(e, 10)}`;
  }
  return String(parseFloat(value.toPrecision(4)));
}
