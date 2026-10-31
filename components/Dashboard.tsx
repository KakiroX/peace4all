"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Flame, Layers, Target } from "lucide-react";
import { ActivityChart } from "@/components/ActivityChart";
import { BandBadge, MasteryBar, pct } from "@/components/Mastery";
import { SubjectIcon } from "@/components/SubjectIcon";
import { ButtonLink, Card, EmptyState, PageHeader, PageSkeleton, SectionTitle, StatTile } from "@/components/ui";
import { useHydrated, useNow } from "@/lib/hydration";
import { useProgress } from "@/lib/store";
import { SUBJECT_LIST } from "@/lib/subjects";
import {
  answeredToday,
  dailyActivity,
  daysUntil,
  recentAccuracy,
  streak,
  subjectSummary,
  weakSpots,
} from "@/lib/stats";

export function Dashboard() {
  const hydrated = useHydrated();
  const now = useNow();
  const topics = useProgress((s) => s.topics);
  const attempts = useProgress((s) => s.attempts);
  const diagnostics = useProgress((s) => s.diagnostics);
  const examDate = useProgress((s) => s.settings.examDate);

  if (!hydrated || !now) return <PageSkeleton />;

  const summaries = SUBJECT_LIST.map((s) => ({ subject: s, summary: subjectSummary(s.id, topics) }));
  const tested = summaries.reduce((n, s) => n + s.summary.tested, 0);
  const total = summaries.reduce((n, s) => n + s.summary.total, 0);
  const weak = weakSpots(topics);
  const days = examDate ? daysUntil(examDate, now) : null;
  const isNew = attempts.length === 0;

  return (
    <div>
      <PageHeader
        title={isNew ? "Welcome to IB Grind" : "Ready to grind?"}
        subtitle={
          days !== null && days >= 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" aria-hidden />
              <span>
                <span className="tabular font-semibold text-ink">{days}</span> day{days === 1 ? "" : "s"} until your first exam
              </span>
            </span>
          ) : (
            <>
              Physics HL · Math AA HL · Chemistry SL · Business Management SL.{" "}
              <Link href="/settings" className="underline underline-offset-2 hover:text-ink">
                Set your exam date
              </Link>
            </>
          )
        }
        actions={
          <ButtonLink href="/grind/all">
            <Layers className="size-4" aria-hidden /> Mixed grind
          </ButtonLink>
        }
      />

      {diagnostics.length === 0 && (
        <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
              <Target className="size-5 text-accent" aria-hidden />
            </span>
            <div>
              <div className="font-semibold">Start with a familiarization test</div>
              <p className="text-sm text-ink-2">
                One adaptive test per subject maps out what you know. Your weak spots then drive the Grinder.
              </p>
            </div>
          </div>
          <ButtonLink href="/diagnostic">
            Take a test <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </Card>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Day streak" value={<span className="tabular">{streak(attempts, now)}</span>} hint="days in a row" />
        <StatTile label="Answered today" value={<span className="tabular">{answeredToday(attempts, now)}</span>} hint="questions" />
        <StatTile label="Accuracy" value={<span className="tabular">{pct(recentAccuracy(attempts, now))}</span>} hint="last 7 days" />
        <StatTile label="Topics tested" value={<span className="tabular">{tested}/{total}</span>} hint="across all subjects" />
      </div>

      <SectionTitle>Subjects</SectionTitle>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {summaries.map(({ subject, summary }) => {
          const last = diagnostics.filter((d) => d.subject === subject.id).at(-1);
          return (
            <Card key={subject.id} className="flex flex-col p-5">
              <Link href={`/subjects/${subject.id}`} className="group flex items-center gap-3">
                <SubjectIcon subject={subject.id} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold group-hover:underline">{subject.name}</div>
                  <div className="text-xs text-muted tabular">
                    {summary.tested}/{summary.total} topics tested · {summary.questionCount} questions
                  </div>
                </div>
                <BandBadge mastery={summary.mastery} />
              </Link>
              <div className="mt-4">
                <MasteryBar mastery={summary.mastery} compact />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href={`/grind/${subject.id}`} size="sm">
                  <Flame className="size-4" aria-hidden /> Grind
                </ButtonLink>
                <ButtonLink href={`/diagnostic/${subject.id}`} size="sm" variant="secondary">
                  <Target className="size-4" aria-hidden />
                  {last ? "Retake test" : "Familiarization test"}
                </ButtonLink>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Top weak spots</SectionTitle>
          {weak.length === 0 ? (
            <EmptyState title={isNew ? "No data yet" : "No weak spots right now"}>
              {isNew ? "Take a familiarization test to find them." : "Nice. Keep grinding to keep it that way."}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {weak.map((w) => (
                <li key={w.key} className="flex items-center gap-3 py-2.5">
                  <SubjectIcon subject={w.subject} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      <span className="font-medium">{w.topic.code}</span> {w.topic.name}
                    </div>
                    <MasteryBar mastery={w.mastery} compact />
                  </div>
                  <ButtonLink href={`/grind/${w.subject}?topics=${encodeURIComponent(w.topic.id)}`} size="sm" variant="ghost">
                    Grind
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <ActivityChart data={dailyActivity(attempts, now, 14)} />
        </Card>
      </div>
    </div>
  );
}
