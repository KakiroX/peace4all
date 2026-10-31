"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, ListChecks, RotateCcw, Target } from "lucide-react";
import { MasteryBar, pct } from "@/components/Mastery";
import { QuestionCard, type AnswerEvent } from "@/components/QuestionCard";
import { SubjectIcon } from "@/components/SubjectIcon";
import { Button, ButtonLink, Card, EmptyState, PageHeader, PageSkeleton, Segmented, SectionTitle } from "@/components/ui";
import { getQuestions } from "@/lib/content";
import { useHydrated } from "@/lib/hydration";
import { isWeak } from "@/lib/mastery";
import {
  createDiagnosticPlan,
  diagnosticLength,
  nextDiagnosticQuestion,
  summarizeDiagnostic,
  type DiagnosticAnswer,
  type DiagnosticPlan,
} from "@/lib/selection";
import { useProgress, type DiagnosticRecord } from "@/lib/store";
import { getSubject, getTopic } from "@/lib/subjects";
import type { Question, SubjectId } from "@/lib/types";

type Phase =
  | { name: "intro" }
  | { name: "running"; plan: DiagnosticPlan; startedAt: number; current: Question; answers: DiagnosticAnswer[]; answered: boolean }
  | { name: "results"; record: DiagnosticRecord };

const DEPTHS = [
  { value: 1, label: "Quick", hint: "1 question per topic" },
  { value: 2, label: "Standard", hint: "Up to 2 questions per topic, adaptive" },
  { value: 3, label: "Thorough", hint: "Up to 3 questions per topic, adaptive" },
] as const;

export function DiagnosticRunner({ subjectId }: { subjectId: SubjectId }) {
  const hydrated = useHydrated();
  const subject = getSubject(subjectId);
  const bank = getQuestions(subjectId);
  const settings = useProgress((s) => s.settings);
  const updateSettings = useProgress((s) => s.updateSettings);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const saveDiagnostic = useProgress((s) => s.saveDiagnostic);
  const lastRecord = useProgress((s) => s.diagnostics.filter((d) => d.subject === subjectId).at(-1));
  const [phase, setPhase] = useState<Phase>({ name: "intro" });

  const depth = settings.diagnosticDepth;
  const coveredTopics = useMemo(() => new Set(bank.map((q) => q.topic)), [bank]);
  const previewLength = useMemo(
    () => diagnosticLength({ subject: subjectId, perTopic: depth, topics: [...coveredTopics] }, bank),
    [subjectId, bank, depth, coveredTopics],
  );

  if (!hydrated) return <PageSkeleton />;

  function start() {
    const plan = createDiagnosticPlan(subjectId, bank, depth);
    const first = nextDiagnosticQuestion(plan, bank, []);
    if (!first) return;
    setPhase({ name: "running", plan, startedAt: Date.now(), current: first, answers: [], answered: false });
  }

  function onAnswered(e: AnswerEvent) {
    if (phase.name !== "running") return;
    const q = phase.current;
    const skipped = e.response.kind === "skip";
    recordAttempt(q, e.grade, { mode: "diagnostic", timeMs: e.timeMs, skipped });
    const answer: DiagnosticAnswer = {
      questionId: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      score: e.grade.score,
      marks: q.marks,
      marksAwarded: e.grade.marksAwarded,
      skipped,
    };
    setPhase({ ...phase, answers: [...phase.answers, answer], answered: true });
  }

  function onNext() {
    if (phase.name !== "running") return;
    const next = nextDiagnosticQuestion(phase.plan, bank, phase.answers);
    if (next) {
      setPhase({ ...phase, current: next, answered: false });
      return;
    }
    finish(phase.plan, phase.answers, phase.startedAt);
  }

  function finish(plan: DiagnosticPlan, answers: DiagnosticAnswer[], startedAt: number) {
    const summary = summarizeDiagnostic(answers);
    const record: DiagnosticRecord = {
      id: `${subjectId}-${startedAt}`,
      subject: subjectId,
      startedAt,
      finishedAt: Date.now(),
      depth: plan.perTopic,
      questions: answers.length,
      marks: summary.marks,
      marksAwarded: summary.marksAwarded,
      topics: summary.topics,
    };
    saveDiagnostic(record);
    setPhase({ name: "results", record });
  }

  // ---------------------------------------------------------------- intro
  if (phase.name === "intro") {
    return (
      <div>
        <PageHeader
          eyebrow={
            <Link href="/diagnostic" className="inline-flex items-center gap-1 hover:text-ink">
              <ArrowLeft className="size-3.5" aria-hidden /> All subjects
            </Link>
          }
          title={`${subject.name}: familiarization test`}
          subtitle="An adaptive check across the whole syllabus. Each topic starts with a medium question, then gets harder or easier depending on how you do. You finish with a ranked list of your weak spots."
        />

        {bank.length === 0 ? (
          <EmptyState icon={<ListChecks className="size-8" />} title="No questions yet">
            Questions for {subject.name} haven&apos;t been added yet.
          </EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <SubjectIcon subject={subjectId} size="lg" />
                <div>
                  <div className="font-semibold">{subject.name}</div>
                  <div className="text-sm text-ink-2">
                    {coveredTopics.size} of {subject.topics.length} topics have questions · {bank.length} questions in the bank
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-sm font-medium">Depth</div>
                <Segmented
                  label="Depth"
                  value={depth}
                  onChange={(v) => updateSettings({ diagnosticDepth: v })}
                  options={DEPTHS.map((d) => ({ value: d.value, label: d.label, hint: d.hint }))}
                />
                <p className="mt-2 text-sm text-ink-2">
                  {DEPTHS.find((d) => d.value === depth)?.hint} · about{" "}
                  <span className="tabular font-medium text-ink">{previewLength}</span> questions
                </p>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-ink-2">
                <li>• Don&apos;t guess. Use <span className="font-medium text-ink">&ldquo;I don&apos;t know&rdquo;</span> so the results stay accurate.</li>
                <li>• Written questions are self-marked against the markscheme.</li>
                <li>• Results feed straight into the Grinder, which drills your weakest topics first.</li>
              </ul>

              <Button size="lg" className="mt-6" onClick={start}>
                <Target className="size-5" aria-hidden />
                Start test
              </Button>
            </Card>

            <Card className="p-5">
              <div className="text-sm font-semibold">Last result</div>
              {lastRecord ? (
                <>
                  <div className="mt-2 text-3xl font-semibold tracking-tight tabular">
                    {pct(lastRecord.marks ? lastRecord.marksAwarded / lastRecord.marks : 0)}
                  </div>
                  <div className="text-sm text-ink-2">
                    {new Date(lastRecord.finishedAt).toLocaleDateString()} · {lastRecord.questions} questions
                  </div>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => setPhase({ name: "results", record: lastRecord })}>
                    View report
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-2">You haven&apos;t taken this test yet.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- running
  if (phase.name === "running") {
    const total = diagnosticLength(phase.plan, bank);
    const index = phase.answers.length + (phase.answered ? 0 : 1);
    const isLast = phase.answered && nextDiagnosticQuestion(phase.plan, bank, phase.answers) === null;
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <SubjectIcon subject={subjectId} size="sm" />
            <span className="truncate font-medium">{subject.name}: familiarization test</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (phase.answers.length > 0 ? finish(phase.plan, phase.answers, phase.startedAt) : setPhase({ name: "intro" }))}
          >
            {phase.answers.length > 0 ? "Finish early" : "Cancel"}
          </Button>
        </div>
        <div className="mb-6">
          <div className="mb-1.5 flex justify-between text-sm text-ink-2">
            <span>
              Question <span className="tabular">{Math.min(index, total)}</span> of <span className="tabular">{total}</span>
            </span>
            <span className="tabular">{Math.round((phase.answers.length / total) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(phase.answers.length / total) * 100}%` }} />
          </div>
        </div>
        <QuestionCard
          key={phase.current.id}
          question={phase.current}
          allowSkip
          onAnswered={onAnswered}
          onNext={onNext}
          nextLabel={isLast ? "See my results" : "Next question"}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------- results
  return <DiagnosticReport record={phase.record} onRetake={() => setPhase({ name: "intro" })} />;
}

export function DiagnosticReport({ record, onRetake }: { record: DiagnosticRecord; onRetake?: () => void }) {
  const subject = getSubject(record.subject);
  const tested = new Set(record.topics.map((t) => t.topic));
  const weak = record.topics.filter((t) => isWeak(t.estimate));
  const untested = subject.topics.filter((t) => !tested.has(t.id));
  const overall = record.marks ? record.marksAwarded / record.marks : 0;
  const weakQuery = weak.map((t) => t.topic).join(",");

  return (
    <div>
      <PageHeader
        eyebrow={`${subject.name} · ${new Date(record.finishedAt).toLocaleString()}`}
        title="Your weak spots"
        subtitle={
          weak.length > 0
            ? `${weak.length} topic${weak.length === 1 ? "" : "s"} need work. Grind them now while it's fresh.`
            : "No weak spots found in the topics tested. Keep it sharp in the Grinder."
        }
        actions={
          <>
            {onRetake && (
              <Button variant="secondary" onClick={onRetake}>
                <RotateCcw className="size-4" aria-hidden /> Retake
              </Button>
            )}
            <ButtonLink href={weak.length ? `/grind/${record.subject}?topics=${encodeURIComponent(weakQuery)}` : `/grind/${record.subject}`}>
              <Flame className="size-4" aria-hidden />
              {weak.length ? "Grind weak spots" : "Start grinding"}
            </ButtonLink>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-ink-2">Score</div>
          <div className="mt-1 text-2xl font-semibold tabular">{pct(overall)}</div>
          <div className="text-xs text-muted tabular">
            {record.marksAwarded}/{record.marks} marks
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-ink-2">Topics tested</div>
          <div className="mt-1 text-2xl font-semibold tabular">
            {record.topics.length}/{subject.topics.length}
          </div>
          <div className="text-xs text-muted tabular">{record.questions} questions</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-ink-2">Weak spots</div>
          <div className="mt-1 text-2xl font-semibold tabular">{weak.length}</div>
          <div className="text-xs text-muted">below 65% estimated mastery</div>
        </Card>
      </div>

      <SectionTitle>Topic breakdown (weakest first)</SectionTitle>
      <Card className="divide-y divide-line">
        {record.topics.map((t) => {
          const topic = getTopic(record.subject, t.topic);
          return (
            <div key={t.topic} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_260px_auto] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <div className="truncate text-sm">
                  <span className="font-medium">{topic?.code}</span> {topic?.name}
                </div>
                <div className="text-xs text-muted tabular">
                  {t.marksAwarded}/{t.marks} marks · {t.n} question{t.n === 1 ? "" : "s"}
                </div>
              </div>
              <MasteryBar mastery={t.estimate} />
              <ButtonLink
                href={`/grind/${record.subject}?topics=${encodeURIComponent(t.topic)}`}
                variant="ghost"
                size="sm"
                aria-label={`Grind ${topic?.name}`}
              >
                Grind
              </ButtonLink>
            </div>
          );
        })}
      </Card>

      {untested.length > 0 && (
        <div className="mt-6">
          <SectionTitle>Not covered yet ({untested.length})</SectionTitle>
          <p className="mb-3 text-sm text-ink-2">These topics have no questions in the bank yet, so the test couldn&apos;t check them.</p>
          <div className="flex flex-wrap gap-2">
            {untested.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink-2">
                <span className="font-medium text-ink">{t.code}</span> {t.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
