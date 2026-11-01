import physicsQuestions from "@/content/questions/physics-hl.json";
import mathQuestions from "@/content/questions/math-aa-hl.json";
import chemQuestions from "@/content/questions/chem-sl.json";
import bmQuestions from "@/content/questions/bm-sl.json";
import type { Question, SubjectId } from "@/lib/types";

// Question banks. Shapes are checked by `npm run validate:content` (and the test suite),
// so the casts here are safe once validation passes.
const BANKS: Record<SubjectId, Question[]> = {
  "physics-hl": physicsQuestions as Question[],
  "math-aa-hl": mathQuestions as Question[],
  "chem-sl": chemQuestions as Question[],
  "bm-sl": bmQuestions as Question[],
};

const BY_ID = new Map<string, Question>();
for (const bank of Object.values(BANKS)) {
  for (const q of bank) BY_ID.set(q.id, q);
}

export function getQuestions(subject: SubjectId): Question[] {
  return BANKS[subject];
}

export function getAllQuestions(): Question[] {
  return Object.values(BANKS).flat();
}

export function getQuestion(id: string): Question | undefined {
  return BY_ID.get(id);
}

export function questionsByTopic(subject: SubjectId): Map<string, Question[]> {
  const map = new Map<string, Question[]>();
  for (const q of BANKS[subject]) {
    const list = map.get(q.topic) ?? [];
    list.push(q);
    map.set(q.topic, list);
  }
  return map;
}

export function questionCount(subject: SubjectId, topic?: string): number {
  const bank = BANKS[subject];
  return topic ? bank.filter((q) => q.topic === topic).length : bank.length;
}
