// Usage: npm run validate:content
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateQuestions, validateSubjects } from "@/lib/validate";
import { SUBJECT_IDS } from "@/lib/types";

const errors = [...validateSubjects()];
let total = 0;
for (const id of SUBJECT_IDS) {
  const raw = JSON.parse(readFileSync(join(process.cwd(), "content", "questions", `${id}.json`), "utf8"));
  total += Array.isArray(raw) ? raw.length : 0;
  errors.push(...validateQuestions(id, raw));
}

if (errors.length) {
  console.error(`✗ ${errors.length} content problem(s):\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ Content OK: ${total} questions across ${SUBJECT_IDS.length} subjects`);
