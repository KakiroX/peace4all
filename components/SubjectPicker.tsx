"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BandBadge, MasteryBar } from "@/components/Mastery";
import { SubjectIcon } from "@/components/SubjectIcon";
import { Card, PageSkeleton } from "@/components/ui";
import { useHydrated } from "@/lib/hydration";
import { useProgress } from "@/lib/store";
import { SUBJECT_LIST } from "@/lib/subjects";
import { subjectSummary } from "@/lib/stats";

/** Grid of subjects linking to `${base}/${subject}`. */
export function SubjectPicker({ base, includeAll = false }: { base: string; includeAll?: boolean }) {
  const hydrated = useHydrated();
  const topics = useProgress((s) => s.topics);
  const diagnostics = useProgress((s) => s.diagnostics);
  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SUBJECT_LIST.map((s) => {
        const summary = subjectSummary(s.id, topics);
        const last = diagnostics.filter((d) => d.subject === s.id).at(-1);
        return (
          <Link key={s.id} href={`${base}/${s.id}`} className="group">
            <Card className="h-full p-5 transition-colors group-hover:border-line-strong group-hover:bg-surface-2">
              <div className="flex items-center gap-3">
                <SubjectIcon subject={s.id} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.name}</div>
                  <div className="text-xs text-muted">
                    {last ? `Last test ${new Date(last.finishedAt).toLocaleDateString()}` : "Not tested yet"} ·{" "}
                    <span className="tabular">{summary.questionCount}</span> questions
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1">
                  <MasteryBar mastery={summary.mastery} compact />
                </div>
                <BandBadge mastery={summary.mastery} />
              </div>
            </Card>
          </Link>
        );
      })}
      {includeAll && (
        <Link href={`${base}/all`} className="group sm:col-span-2">
          <Card className="flex items-center gap-3 p-5 transition-colors group-hover:border-line-strong group-hover:bg-surface-2">
            <SubjectIcon subject="all" />
            <div className="flex-1">
              <div className="font-semibold">All subjects (mixed)</div>
              <div className="text-xs text-muted">Interleaved practice across every subject, weakest topics first</div>
            </div>
            <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Card>
        </Link>
      )}
    </div>
  );
}
