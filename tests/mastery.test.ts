import { describe, expect, it } from "vitest";
import {
  bandOf,
  estimateFromAnswers,
  isDue,
  masteryOf,
  updateQuestionStat,
  updateTopicStat,
  BOX_INTERVALS,
} from "@/lib/mastery";

describe("topic mastery", () => {
  it("is null until tested", () => {
    expect(masteryOf(undefined)).toBeNull();
    expect(bandOf(null)).toBe("untested");
  });

  it("moves up on correct answers and down on wrong ones", () => {
    const up = updateTopicStat(undefined, 1, 2, 0);
    const down = updateTopicStat(undefined, 0, 2, 0);
    expect(masteryOf(up)!).toBeGreaterThan(0.5);
    expect(masteryOf(down)!).toBeLessThan(0.5);
  });

  it("rewards hard questions more than easy ones", () => {
    const hard = updateTopicStat(undefined, 1, 3, 0);
    const easy = updateTopicStat(undefined, 1, 1, 0);
    expect(hard.theta).toBeGreaterThan(easy.theta);
  });

  it("converges towards mastered after a run of correct answers", () => {
    const m = estimateFromAnswers(Array.from({ length: 8 }, () => ({ score: 1, difficulty: 2 as const })));
    expect(bandOf(m)).toBe("mastered");
  });

  it("flags a topic with only wrong answers as weak", () => {
    const m = estimateFromAnswers([
      { score: 0, difficulty: 2 },
      { score: 0, difficulty: 1 },
    ]);
    expect(bandOf(m)).toBe("weak");
  });
});

describe("question spaced repetition", () => {
  it("promotes on success and resets on failure", () => {
    const a = updateQuestionStat(undefined, 1, 0);
    expect(a.box).toBe(1);
    const b = updateQuestionStat(a, 0, 1);
    expect(b.box).toBe(0);
  });

  it("becomes due after its interval", () => {
    const s = updateQuestionStat(undefined, 0, 0);
    expect(isDue(s, BOX_INTERVALS[0] - 1)).toBe(false);
    expect(isDue(s, BOX_INTERVALS[0])).toBe(true);
  });
});
