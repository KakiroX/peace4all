import { describe, expect, it } from "vitest";
import { formatAnswer, grade } from "@/lib/grading";
import type { McqQuestion, NumericQuestion, WrittenQuestion } from "@/lib/types";

const base = { subject: "physics-hl" as const, topic: "A.1", difficulty: 2 as const, prompt: "?" };
const mcq: McqQuestion = { ...base, id: "m", type: "mcq", marks: 1, options: ["a", "b", "c"], answer: 1 };
const num: NumericQuestion = { ...base, id: "n", type: "numeric", marks: 2, answer: 99720 };
const written: WrittenQuestion = { ...base, id: "w", type: "written", marks: 4, markscheme: "…" };

describe("grade", () => {
  it("marks MCQ", () => {
    expect(grade(mcq, { kind: "mcq", choice: 1 })).toMatchObject({ score: 1, correct: true, marksAwarded: 1 });
    expect(grade(mcq, { kind: "mcq", choice: 0 })).toMatchObject({ score: 0, correct: false });
  });

  it("marks numeric answers within the subject tolerance (physics 2%)", () => {
    expect(grade(num, { kind: "numeric", raw: "1.0e5" }).correct).toBe(true);
    expect(grade(num, { kind: "numeric", raw: "99720 Pa" }).marksAwarded).toBe(2);
    expect(grade(num, { kind: "numeric", raw: "1.1e5" }).correct).toBe(false);
  });

  it("explains unreadable numeric answers", () => {
    expect(grade(num, { kind: "numeric", raw: "lots" }).note).toMatch(/number/);
  });

  it("respects absolute tolerance", () => {
    const q = { ...num, answer: 0, absTolerance: 0.01 };
    expect(grade(q, { kind: "numeric", raw: "0.005" }).correct).toBe(true);
    expect(grade(q, { kind: "numeric", raw: "0.02" }).correct).toBe(false);
  });

  it("scores self-marked written answers as a fraction of marks", () => {
    expect(grade(written, { kind: "written", text: "", awarded: 3 })).toMatchObject({ score: 0.75, correct: true });
    expect(grade(written, { kind: "written", text: "", awarded: 9 }).marksAwarded).toBe(4);
  });

  it("scores skips as zero", () => {
    expect(grade(mcq, { kind: "skip" })).toMatchObject({ score: 0, correct: false });
  });
});

describe("formatAnswer", () => {
  it("uses standard form for large/small numbers", () => {
    expect(formatAnswer(250000)).toBe("2.5 × 10^5");
    expect(formatAnswer(0.00012)).toBe("1.2 × 10^-4");
    expect(formatAnswer(3000)).toBe("3000");
    expect(formatAnswer(7 / 9)).toBe("0.7778");
  });
});
