"use client";

import Link from "next/link";
import { Flame, Target } from "lucide-react";
import { MasteryBar, pct } from "@/components/Mastery";
import { SubjectIcon } from "@/components/SubjectIcon";
import { ButtonLink, Card, PageHeader, PageSkeleton, SectionTitle, StatTile } from "@/components/ui";
import { useHydrated } from "@/lib/hydration";
import { useProgress } from "@/lib/store";
import { getSubject, topicsByUnit } from "@/lib/subjects";
import { subjectSummary, topicMasteries, weakSpots } from "@/lib/stats";
import type { SubjectId } from "@/lib/types";

export function SubjectView({ subjectId }: { subjectId: SubjectId }) {
  const hydrated = useHydrated();
  const topics = useProgress((s) => s.topics);
  const diagnostics = useProgress((s) => s.diagnostics);
  const subject = getSubject(subjectId);

  if (!hydrated) return <PageSkeleton />;

  const summary = subjectSummary(subjectId, topics);
  const masteries = new Map(topicMasteries(subjectId, topics).map((t) => [t.topic.id, t]));
  const history = diagnostics.filter((d) => d.subject === subjectId).slice().reverse();
  const weak = weakSpots(topics, subjectId, 50);

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <SubjectIcon subject={subjectId} size="sm" /> {subject.level} · {subject.topics.length} topics
          </span>
        }
        title={subject.name}
        subtitle={subject.papers.map((p) => `${p.name}: ${p.description}`).join(" · ")}
        actions={
          <>
            <ButtonLink href={`/diagnostic/${subjectId}`} variant="secondary">
              <Target className="size-4" aria-hidden /> Familiarization test
            </ButtonLink>
            <ButtonLink href={`/grind/${subjectId}`}>
              <Flame className="size-4" aria-hidden /> Grind
            </ButtonLink>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Mastery" value={<span className="tabular">{pct(summary.mastery)}</span>} hint="average of tested topics" />
        <StatTile label="Topics tested" value={<span className="tabular">{summary.tested}/{summary.total}</span>} />
        <StatTile label="Weak spots" value={<span className="tabular">{weak.length}</span>} hint="below 65%" />
        <StatTile label="Question bank" value={<span className="tabular">{summary.questionCount}</span>} hint="questions" />
      </div>

      <SectionTitle>Syllabus</SectionTitle>
      <div className="space-y-4">
        {topicsByUnit(subject).map(({ unit, topics: list }) => (
          <Card key={unit.id}>
            <div className="border-b border-line px-4 py-3 text-sm font-semibold">{unit.name}</div>
            <ul className="divide-y divide-line">
              {list.map((t) => {
                const m = masteries.get(t.id)!;
                return (
                  <li key={t.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_280px_auto] sm:items-center sm:gap-4">
                    <div className="min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{t.code}</span> {t.name}
                        {t.ahl && (
                          <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-2">
                            AHL
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {m.questionCount} question{m.questionCount === 1 ? "" : "s"}
                        {t.covers?.length ? ` · ${t.covers.join(", ")}` : ""}
                      </div>
                    </div>
                    <MasteryBar mastery={m.mastery} />
                    {m.questionCount > 0 ? (
                      <ButtonLink href={`/grind/${subjectId}?topics=${encodeURIComponent(t.id)}`} variant="ghost" size="sm" aria-label={`Grind ${t.name}`}>
                        Grind
                      </ButtonLink>
                    ) : (
                      <span className="px-3 text-xs text-muted">No questions</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <SectionTitle>Familiarization test history</SectionTitle>
        {history.length === 0 ? (
          <p className="text-sm text-ink-2">
            No tests yet.{" "}
            <Link href={`/diagnostic/${subjectId}`} className="underline underline-offset-2 hover:text-ink">
              Take one now
            </Link>{" "}
            to map your weak spots.
          </p>
        ) : (
          <Card className="divide-y divide-line">
            {history.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span>{new Date(d.finishedAt).toLocaleString()}</span>
                <span className="tabular text-ink-2">
                  {d.questions} questions · {d.marksAwarded}/{d.marks} marks ·{" "}
                  <span className="font-medium text-ink">{pct(d.marks ? d.marksAwarded / d.marks : 0)}</span>
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
