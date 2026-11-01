import { describe, expect, it } from "vitest";
import { getQuestions } from "@/lib/content";
import { grade } from "@/lib/grading";
import { lintMarkdown, validateQuestions, validateSubjects } from "@/lib/validate";
import { SUBJECT_IDS } from "@/lib/types";

describe("content", () => {
  it("syllabi are well-formed", () => {
    expect(validateSubjects()).toEqual([]);
  });

  it.each(SUBJECT_IDS)("%s question bank is valid", (id) => {
    expect(validateQuestions(id, getQuestions(id))).toEqual([]);
  });

  it.each(SUBJECT_IDS)("%s numeric answers accept their own stored value", (id) => {
    for (const q of getQuestions(id)) {
      if (q.type === "numeric") expect(grade(q, { kind: "numeric", raw: String(q.answer) }).correct).toBe(true);
    }
  });
});

describe("lintMarkdown", () => {
  it("flags currency inside math and unbalanced delimiters", () => {
    expect(lintMarkdown("costs $\\$500$")).toHaveLength(1);
    expect(lintMarkdown("costs $x")).toHaveLength(1);
  });
  it("accepts currency outside math and normal math", () => {
    expect(lintMarkdown("costs \\$500 and $x^2$ and $$\\int x$$")).toEqual([]);
  });
});
