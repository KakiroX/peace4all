"use client";

import { useState } from "react";
import clsx from "clsx";
import { ActivityChart } from "@/components/ActivityChart";
import { BAND_COLOR, pct } from "@/components/Mastery";
import { SubjectIcon } from "@/components/SubjectIcon";
import { Card, PageHeader, PageSkeleton, Segmented, SectionTitle, StatTile } from "@/components/ui";
import { useHydrated, useNow } from "@/lib/hydration";
import { BAND_LABEL, bandOf, type Band } from "@/lib/mastery";
import { useProgress } from "@/lib/store";
import { SUBJECT_LIST, getSubject, topicsByUnit } from "@/lib/subjects";
import { dailyActivity, recentAccuracy, topicMasteries } from "@/lib/stats";
import type { SubjectId } from "@/lib/types";

const LEGEND: Band[] = ["weak", "shaky", "solid", "mastered", "untested"];

export function ProgressView() {
  const hydrated = useHydrated();
  const now = useNow();
  const topics = useProgress((s) => s.topics);
  const attempts = useProgress((s) => s.attempts);
  const [subjectId, setSubjectId] = useState<SubjectId>("physics-hl");

  if (!hydrated || !now) return <PageSkeleton />;

  const subject = getSubject(subjectId);
  const masteries = new Map(topicMasteries(subjectId, topics).map((t) => [t.topic.id, t]));
  const subjectAttempts = attempts.filter((a) => a.subject === subjectId);
  const totalTime = attempts.reduce((s, a) => s + a.timeMs, 0);

  return (
    <div>
      <PageHeader title="Progress" subtitle="How your mastery is spread across each syllabus, and how much you've been grinding." />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Questions answered" value={<span className="tabular">{attempts.length}</span>} hint="all time" />
        <StatTile label="Accuracy" value={<span className="tabular">{pct(recentAccuracy(attempts, now, 30))}</span>} hint="last 30 days" />
        <StatTile label="Time practising" value={<span className="tabular">{Math.round(totalTime / 60000)} min</span>} hint="all time" />
        <StatTile
          label="Familiarization tests"
          value={<span className="tabular">{new Set(attempts.filter((a) => a.mode === "diagnostic").map((a) => a.subject)).size}/4</span>}
          hint="subjects tested"
        />
      </div>

      <Card className="mb-8 p-5">
        <ActivityChart data={dailyActivity(attempts, now, 14)} title="Questions answered per day (all subjects)" />
      </Card>

      <SectionTitle>Topic map</SectionTitle>
      <div className="mb-4 overflow-x-auto">
        <Segmented
          label="Subject"
          value={subjectId}
          onChange={setSubjectId}
          options={SUBJECT_LIST.map((s) => ({ value: s.id, label: s.shortName }))}
        />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <SubjectIcon subject={subjectId} size="sm" /> {subject.name}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Legend">
            {LEGEND.map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: BAND_COLOR[b] }} aria-hidden />
                {BAND_LABEL[b]}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-5">
          {topicsByUnit(subject).map(({ unit, topics: list }) => (
            <div key={unit.id}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{unit.name}</div>
              <div className="grid grid-cols-2 gap-[2px] sm:grid-cols-3 lg:grid-cols-4">
                {list.map((t) => {
                  const m = masteries.get(t.id)!;
                  const band = bandOf(m.mastery);
                  const dark = band === "weak" || band === "solid" || band === "mastered";
                  return (
                    <div
                      key={t.id}
                      className={clsx("flex min-h-16 flex-col justify-between rounded-md p-2.5 text-xs", band === "untested" && "border border-dashed border-line-strong")}
                      style={band === "untested" ? undefined : { backgroundColor: BAND_COLOR[band], color: dark ? "#ffffff" : "#0b0b0b" }}
                      title={`${t.code} ${t.name}: ${BAND_LABEL[band]}${m.mastery !== null ? ` (${pct(m.mastery)})` : ""} · ${m.n} answers`}
                    >
                      <div className="line-clamp-2 font-medium leading-snug">
                        {t.code} {t.name}
                      </div>
                      <div className="tabular mt-1 flex justify-between opacity-90">
                        <span>{m.mastery === null ? BAND_LABEL[band] : pct(m.mastery)}</span>
                        <span>{m.n > 0 ? `${m.n} ans` : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted tabular">
          {subjectAttempts.length} answers in {subject.name}. Mastery is an estimate of your chance of scoring on a medium-difficulty question in that topic.
        </p>
      </Card>
    </div>
  );
}
