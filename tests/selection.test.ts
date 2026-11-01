import { describe, expect, it } from "vitest";
import { getQuestions } from "@/lib/content";
import { updateTopicStat } from "@/lib/mastery";
import {
  createDiagnosticPlan,
  diagnosticLength,
  filterPool,
  nextDiagnosticQuestion,
  pickGrindQuestion,
  summarizeDiagnostic,
  type DiagnosticAnswer,
} from "@/lib/selection";
import type { Question } from "@/lib/types";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const q = (id: string, topic: string, difficulty: 1 | 2 | 3): Question => ({
  id,
  subject: "physics-hl",
  topic,
  difficulty,
  type: "mcq",
  marks: 1,
  prompt: id,
  options: ["a", "b"],
  answer: 0,
});

const bank = [q("a1", "A.1", 1), q("a2", "A.1", 2), q("a3", "A.1", 3), q("b1", "B.1", 2), q("b2", "B.1", 1)];

describe("diagnostic", () => {
  it("covers every topic with questions and respects depth", () => {
    const plan = createDiagnosticPlan("physics-hl", bank, 2, seeded(1));
    expect(plan.topics.sort()).toEqual(["A.1", "B.1"]);
    expect(diagnosticLength(plan, bank)).toBe(4);
  });

  it("starts medium, steps up after success and down after failure", () => {
    const plan = { subject: "physics-hl" as const, perTopic: 2, topics: ["A.1"] };
    const first = nextDiagnosticQuestion(plan, bank, [], seeded(2))!;
    expect(first.difficulty).toBe(2);
    const ans = (score: number): DiagnosticAnswer => ({
      questionId: first.id, topic: "A.1", difficulty: 2, score, marks: 1, marksAwarded: score, skipped: false,
    });
    expect(nextDiagnosticQuestion(plan, bank, [ans(1)], seeded(3))!.difficulty).toBe(3);
    expect(nextDiagnosticQuestion(plan, bank, [ans(0)], seeded(3))!.difficulty).toBe(1);
  });

  it("visits topics round-robin and ends", () => {
    const plan = { subject: "physics-hl" as const, perTopic: 1, topics: ["A.1", "B.1"] };
    const answers: DiagnosticAnswer[] = [];
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      const next = nextDiagnosticQuestion(plan, bank, answers, seeded(i));
      if (!next) break;
      seen.push(next.topic);
      answers.push({ questionId: next.id, topic: next.topic, difficulty: next.difficulty, score: 1, marks: 1, marksAwarded: 1, skipped: false });
    }
    expect(seen).toEqual(["A.1", "B.1"]);
  });

  it("ranks the weakest topics first", () => {
    const summary = summarizeDiagnostic([
      { questionId: "a2", topic: "A.1", difficulty: 2, score: 1, marks: 1, marksAwarded: 1, skipped: false },
      { questionId: "b1", topic: "B.1", difficulty: 2, score: 0, marks: 1, marksAwarded: 0, skipped: true },
    ]);
    expect(summary.topics[0].topic).toBe("B.1");
    expect(summary.marksAwarded).toBe(1);
  });
});

describe("grinder", () => {
  it("filters by subject, topic and type", () => {
    const pool = filterPool(getQuestions("chem-sl"), { subjects: ["chem-sl"], topics: ["chem-sl:R3.1"] });
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((x) => x.topic === "R3.1")).toBe(true);
  });

  it("favours weak topics in weak-spot mode", () => {
    const now = Date.now();
    let strong = updateTopicStat(undefined, 1, 3, now);
    for (let i = 0; i < 6; i++) strong = updateTopicStat(strong, 1, 3, now);
    let weak = updateTopicStat(undefined, 0, 1, now);
    weak = updateTopicStat(weak, 0, 1, now);
    const topicStats = { "physics-hl:A.1": strong, "physics-hl:B.1": weak };
    const rng = seeded(42);
    let weakPicks = 0;
    for (let i = 0; i < 400; i++) {
      const pick = pickGrindQuestion(bank, "weak", { topicStats, questionStats: {}, recent: [], now, rng });
      if (pick?.topic === "B.1") weakPicks++;
    }
    expect(weakPicks / 400).toBeGreaterThan(0.75);
  });

  it("avoids immediately repeating recent questions", () => {
    const rng = seeded(7);
    for (let i = 0; i < 50; i++) {
      const pick = pickGrindQuestion(bank, "shuffle", { topicStats: {}, questionStats: {}, recent: ["a1", "a2"], now: 0, rng });
      expect(["a1", "a2"]).not.toContain(pick!.id);
    }
  });
});
