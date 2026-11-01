// Content validation: catches broken question data before it reaches the app.

import { SUBJECTS } from "@/lib/subjects";
import { SUBJECT_IDS, type SubjectId } from "@/lib/types";

const TYPES = ["mcq", "numeric", "written"];

/**
 * Markdown/LaTeX problems that render badly. Currently: an escaped dollar (\$) inside
 * $…$ math closes the math early. Write currency outside math: "costs \$500".
 */
export function lintMarkdown(text: string): string[] {
  const problems: string[] = [];
  let inMath = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") {
      if (text[i + 1] === "$" && inMath) problems.push("currency \\$ inside $…$ math; move it outside the math");
      i++;
      continue;
    }
    if (c === "$") {
      if (text[i + 1] === "$") i++;
      inMath = !inMath;
    }
  }
  if (inMath) problems.push("unbalanced $ math delimiters");
  return problems;
}

export function validateQuestions(subject: SubjectId, raw: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(raw)) return [`${subject}: question bank must be a JSON array`];
  const topics = new Set(SUBJECTS[subject].topics.map((t) => t.id));
  const ids = new Set<string>();

  raw.forEach((q: Record<string, unknown>, i) => {
    const where = `${subject}[${i}]${typeof q?.id === "string" ? ` (${q.id})` : ""}`;
    const err = (msg: string) => errors.push(`${where}: ${msg}`);
    if (!q || typeof q !== "object") return err("not an object");

    if (typeof q.id !== "string" || !q.id) err("missing id");
    else if (ids.has(q.id)) err("duplicate id");
    else ids.add(q.id);

    if (q.subject !== subject) err(`subject must be "${subject}"`);
    if (typeof q.topic !== "string" || !topics.has(q.topic)) err(`unknown topic "${String(q.topic)}"`);
    if (![1, 2, 3].includes(q.difficulty as number)) err("difficulty must be 1, 2 or 3");
    if (typeof q.marks !== "number" || q.marks < 1 || !Number.isInteger(q.marks)) err("marks must be a positive integer");
    if (typeof q.prompt !== "string" || !q.prompt.trim()) err("missing prompt");
    if (!TYPES.includes(q.type as string)) return err(`type must be one of ${TYPES.join(", ")}`);

    if (q.type === "mcq") {
      if (!Array.isArray(q.options) || q.options.length < 2) err("mcq needs at least 2 options");
      else if (!Number.isInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) >= q.options.length)
        err("mcq answer must be a valid option index");
    }
    if (q.type === "numeric") {
      if (typeof q.answer !== "number" || !Number.isFinite(q.answer)) err("numeric answer must be a number");
      if (q.tolerance !== undefined && (typeof q.tolerance !== "number" || q.tolerance < 0)) err("bad tolerance");
      if (q.absTolerance !== undefined && (typeof q.absTolerance !== "number" || q.absTolerance < 0))
        err("bad absTolerance");
    }
    if (q.type === "written" && (typeof q.markscheme !== "string" || !q.markscheme.trim())) {
      err("written question needs a markscheme");
    }

    const texts: [string, unknown][] = [
      ["prompt", q.prompt],
      ["explanation", q.explanation],
      ["markscheme", q.markscheme],
      ...(Array.isArray(q.options) ? q.options.map((o, j): [string, unknown] => [`option ${j}`, o]) : []),
    ];
    for (const [field, value] of texts) {
      if (typeof value === "string") for (const p of lintMarkdown(value)) err(`${field}: ${p}`);
    }
  });
  return errors;
}

export function validateSubjects(): string[] {
  const errors: string[] = [];
  for (const id of SUBJECT_IDS) {
    const s = SUBJECTS[id];
    const units = new Set(s.units.map((u) => u.id));
    const seen = new Set<string>();
    for (const t of s.topics) {
      if (seen.has(t.id)) errors.push(`${id}: duplicate topic id ${t.id}`);
      seen.add(t.id);
      if (!units.has(t.unit)) errors.push(`${id}: topic ${t.id} has unknown unit ${t.unit}`);
    }
  }
  return errors;
}
