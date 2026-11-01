import physicsHL from "@/content/subjects/physics-hl";
import mathAAHL from "@/content/subjects/math-aa-hl";
import chemSL from "@/content/subjects/chem-sl";
import bmSL from "@/content/subjects/bm-sl";
import { SUBJECT_IDS, type Subject, type SubjectId, type Topic } from "@/lib/types";

export const SUBJECTS: Record<SubjectId, Subject> = {
  "physics-hl": physicsHL,
  "math-aa-hl": mathAAHL,
  "chem-sl": chemSL,
  "bm-sl": bmSL,
};

export const SUBJECT_LIST: Subject[] = SUBJECT_IDS.map((id) => SUBJECTS[id]);

export function isSubjectId(value: string): value is SubjectId {
  return (SUBJECT_IDS as readonly string[]).includes(value);
}

export function getSubject(id: SubjectId): Subject {
  return SUBJECTS[id];
}

/** Stable key for a topic across subjects. */
export function topicKey(subject: SubjectId, topic: string): string {
  return `${subject}:${topic}`;
}

export function getTopic(subject: SubjectId, topicId: string): Topic | undefined {
  return SUBJECTS[subject].topics.find((t) => t.id === topicId);
}

export function topicsByUnit(subject: Subject): { unit: Subject["units"][number]; topics: Topic[] }[] {
  return subject.units.map((unit) => ({
    unit,
    topics: subject.topics.filter((t) => t.unit === unit.id),
  }));
}
