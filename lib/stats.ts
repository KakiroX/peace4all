// Derived statistics for the dashboard and progress pages.

import { getQuestions } from "@/lib/content";
import { masteryOf, type TopicStat } from "@/lib/mastery";
import { SUBJECT_LIST, getSubject, topicKey } from "@/lib/subjects";
import type { Attempt, SubjectId, Topic } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Consecutive days (ending today, or yesterday if nothing yet today) with at least one answer. */
export function streak(attempts: Attempt[], now: number): number {
  const days = new Set(attempts.map((a) => dayKey(a.at)));
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor -= DAY;
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count++;
    cursor = startOfDay(cursor - DAY / 2);
  }
  return count;
}

export function answeredToday(attempts: Attempt[], now: number): number {
  const today = dayKey(now);
  return attempts.filter((a) => dayKey(a.at) === today).length;
}

/** Average score over attempts in the last `days` days, or null with no data. */
export function recentAccuracy(attempts: Attempt[], now: number, days = 7): number | null {
  const since = now - days * DAY;
  const recent = attempts.filter((a) => a.at >= since);
  if (recent.length === 0) return null;
  return recent.reduce((s, a) => s + a.score, 0) / recent.length;
}

export interface DayActivity {
  key: string;
  date: Date;
  count: number;
  accuracy: number | null;
}

export function dailyActivity(attempts: Attempt[], now: number, days = 14, subject?: SubjectId): DayActivity[] {
  const out: DayActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(startOfDay(now));
    date.setDate(date.getDate() - i);
    const key = dayKey(date.getTime());
    const list = attempts.filter((a) => dayKey(a.at) === key && (!subject || a.subject === subject));
    out.push({
      key,
      date,
      count: list.length,
      accuracy: list.length ? list.reduce((s, a) => s + a.score, 0) / list.length : null,
    });
  }
  return out;
}

export interface TopicMastery {
  subject: SubjectId;
  topic: Topic;
  key: string;
  mastery: number | null;
  n: number;
  questionCount: number;
}

export function topicMasteries(subject: SubjectId, stats: Record<string, TopicStat>): TopicMastery[] {
  const bank = getQuestions(subject);
  return getSubject(subject).topics.map((topic) => {
    const key = topicKey(subject, topic.id);
    return {
      subject,
      topic,
      key,
      mastery: masteryOf(stats[key]),
      n: stats[key]?.n ?? 0,
      questionCount: bank.filter((q) => q.topic === topic.id).length,
    };
  });
}

export interface SubjectSummary {
  subject: SubjectId;
  /** Mean mastery over tested topics, or null. */
  mastery: number | null;
  tested: number;
  total: number;
  questionCount: number;
}

export function subjectSummary(subject: SubjectId, stats: Record<string, TopicStat>): SubjectSummary {
  const tms = topicMasteries(subject, stats);
  const tested = tms.filter((t) => t.mastery !== null);
  return {
    subject,
    mastery: tested.length ? tested.reduce((s, t) => s + (t.mastery ?? 0), 0) / tested.length : null,
    tested: tested.length,
    total: tms.length,
    questionCount: getQuestions(subject).length,
  };
}

/** Weakest tested topics, optionally across all subjects. */
export function weakSpots(stats: Record<string, TopicStat>, subject?: SubjectId, limit = 6): TopicMastery[] {
  const subjects = subject ? [subject] : SUBJECT_LIST.map((s) => s.id);
  return subjects
    .flatMap((id) => topicMasteries(id, stats))
    .filter((t) => t.mastery !== null && t.mastery < 0.65 && t.questionCount > 0)
    .sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0))
    .slice(0, limit);
}

export function daysUntil(isoDate: string, now: number): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  return Math.ceil((target - startOfDay(now)) / DAY);
}
