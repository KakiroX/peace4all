"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, Check, Flame, RotateCcw, Settings2, Zap } from "lucide-react";
import { BandBadge, MasteryBar, pct } from "@/components/Mastery";
import { QuestionCard, type AnswerEvent } from "@/components/QuestionCard";
import { SubjectIcon } from "@/components/SubjectIcon";
import { Button, Card, EmptyState, PageHeader, PageSkeleton, Segmented, SectionTitle } from "@/components/ui";
import { getAllQuestions } from "@/lib/content";
import { useHydrated } from "@/lib/hydration";
import { isWeak, masteryOf, type TopicStat } from "@/lib/mastery";
import { filterPool, pickGrindQuestion, type GrindFilter, type GrindMode } from "@/lib/selection";
import { useProgress } from "@/lib/store";
import { SUBJECT_LIST, getSubject, getTopic, topicKey, topicsByUnit } from "@/lib/subjects";
import type { Difficulty, Question, QuestionType, SubjectId } from "@/lib/types";

const RETRY_GAP = 3;
const LENGTHS = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 40, label: "40" },
  { value: 0, label: "Endless" },
];
const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "Multiple choice" },
  { value: "numeric", label: "Numeric" },
  { value: "written", label: "Written (self-marked)" },
];

interface Config {
  subjects: SubjectId[];
  topics: string[]; // topic keys; empty = all
  mode: GrindMode;
  difficulty: Difficulty | 0; // 0 = any
  types: QuestionType[];
  length: number;
}

interface SessionAnswer {
  question: Question;
  score: number;
  marksAwarded: number;
  retry: boolean;
}

interface Session {
  config: Config;
  pool: Question[];
  current: Question;
  currentIsRetry: boolean;
  answered: boolean;
  answers: SessionAnswer[];
  retries: { id: string; dueAt: number }[];
  served: string[];
  streak: number;
  bestStreak: number;
  topicsBefore: Record<string, TopicStat>;
}

function toFilter(c: Omit<Config, "length">): GrindFilter {
  return {
    subjects: c.subjects,
    topics: c.topics,
    difficulties: c.difficulty ? [c.difficulty] : undefined,
    types: c.types,
  };
}

export function Grinder({ scope }: { scope: SubjectId | "all" }) {
  const hydrated = useHydrated();
  const searchParams = useSearchParams();
  const topicStats = useProgress((s) => s.topics);
  const defaultLength = useProgress((s) => s.settings.grindLength);
  const updateSettings = useProgress((s) => s.updateSettings);
  const recordAttempt = useProgress((s) => s.recordAttempt);

  const allQuestions = useMemo(() => getAllQuestions(), []);
  const presetTopics = useMemo(() => {
    const raw = searchParams.get("topics");
    if (!raw || scope === "all") return [];
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => getTopic(scope, t))
      .map((t) => topicKey(scope, t));
  }, [searchParams, scope]);

  const [setup, setSetup] = useState<Omit<Config, "length">>(() => ({
    subjects: scope === "all" ? SUBJECT_LIST.map((s) => s.id) : [scope],
    topics: presetTopics,
    mode: "weak",
    difficulty: 0,
    types: TYPE_OPTIONS.map((t) => t.value),
  }));
  const config: Config = { ...setup, length: defaultLength };
  const setConfig = (c: Config) => {
    const { length, ...rest } = c;
    setSetup(rest);
    if (length !== defaultLength) updateSettings({ grindLength: length });
  };
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<Session | null>(null);
  const autoStarted = useRef(false);

  const pool = useMemo(() => filterPool(allQuestions, toFilter(setup)), [allQuestions, setup]);

  function startSession(c: Config = config) {
    const p = filterPool(allQuestions, toFilter(c));
    const state = useProgress.getState();
    const first = pickGrindQuestion(p, c.mode, {
      topicStats: state.topics,
      questionStats: state.questions,
      recent: [],
      now: Date.now(),
    });
    if (!first) return;
    setSummary(null);
    setSession({
      config: c,
      pool: p,
      current: first,
      currentIsRetry: false,
      answered: false,
      answers: [],
      retries: [],
      served: [first.id],
      streak: 0,
      bestStreak: 0,
      topicsBefore: state.topics,
    });
  }

  // Coming from "Grind weak spots": jump straight in.
  useEffect(() => {
    if (!hydrated || autoStarted.current || presetTopics.length === 0) return;
    autoStarted.current = true;
    startSession({ ...config, topics: presetTopics, length: defaultLength });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, presetTopics]);

  if (!hydrated) return <PageSkeleton />;

  function onAnswered(e: AnswerEvent) {
    if (!session) return;
    const q = session.current;
    recordAttempt(q, e.grade, { mode: "grind", timeMs: e.timeMs, skipped: e.response.kind === "skip" });
    const good = e.grade.score >= 0.75;
    const streak = good ? session.streak + 1 : 0;
    setSession({
      ...session,
      answered: true,
      streak,
      bestStreak: Math.max(session.bestStreak, streak),
      answers: [...session.answers, { question: q, score: e.grade.score, marksAwarded: e.grade.marksAwarded, retry: session.currentIsRetry }],
      // Missed it? It comes back in a few questions.
      retries: good ? session.retries : [...session.retries, { id: q.id, dueAt: session.served.length + RETRY_GAP }],
    });
  }

  function onNext() {
    if (!session) return;
    const { config: c } = session;
    if (c.length > 0 && session.answers.length >= c.length) {
      setSummary(session);
      setSession(null);
      return;
    }
    const servedCount = session.served.length;
    const due = session.retries.find((r) => r.dueAt <= servedCount);
    let next: Question | null = null;
    let isRetry = false;
    let retries = session.retries;
    if (due) {
      next = session.pool.find((q) => q.id === due.id) ?? null;
      retries = retries.filter((r) => r !== due);
      isRetry = next !== null;
    }
    if (!next) {
      const state = useProgress.getState();
      next = pickGrindQuestion(session.pool, c.mode, {
        topicStats: state.topics,
        questionStats: state.questions,
        recent: session.served,
        now: Date.now(),
      });
    }
    if (!next) return;
    setSession({ ...session, current: next, currentIsRetry: isRetry, answered: false, retries, served: [...session.served, next.id] });
  }

  // ------------------------------------------------------------------ running
  if (session) {
    const { answers, config: c } = session;
    const accuracy = answers.length ? answers.reduce((s, a) => s + a.score, 0) / answers.length : null;
    const isLast = c.length > 0 && session.answered && answers.length >= c.length;
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <SubjectIcon subject={scope} size="sm" />
            <span className="truncate font-medium">{scope === "all" ? "Mixed grind" : `${getSubject(scope).name} grind`}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (answers.length) setSummary(session);
              setSession(null);
            }}
          >
            End session
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card className="px-4 py-3">
            <div className="text-xs text-ink-2">Answered</div>
            <div className="tabular text-lg font-semibold">
              {answers.length}
              {c.length > 0 && <span className="font-normal text-muted">/{c.length}</span>}
            </div>
          </Card>
          <Card className="px-4 py-3">
            <div className="text-xs text-ink-2">Accuracy</div>
            <div className="tabular text-lg font-semibold">{pct(accuracy)}</div>
          </Card>
          <Card className="px-4 py-3">
            <div className="text-xs text-ink-2">Streak</div>
            <div className="tabular flex items-center gap-1 text-lg font-semibold">
              {session.streak}
              {session.streak >= 3 && <Flame className="size-4 text-serious" aria-label="On fire" />}
            </div>
          </Card>
        </div>

        <QuestionCard
          key={`${session.current.id}-${session.served.length}`}
          question={session.current}
          allowSkip
          skipLabel="Skip & show answer"
          onAnswered={onAnswered}
          onNext={onNext}
          nextLabel={isLast ? "Finish session" : "Next question"}
          badge={
            session.currentIsRetry ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink">
                <RotateCcw className="size-3" aria-hidden /> Retry
              </span>
            ) : undefined
          }
        />
        {session.retries.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            {session.retries.length} missed question{session.retries.length === 1 ? "" : "s"} queued to come back.
          </p>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------ summary
  if (summary) {
    return <SessionSummary session={summary} onAgain={() => startSession(summary.config)} onSetup={() => setSummary(null)} />;
  }

  // ------------------------------------------------------------------ setup
  const subjects = scope === "all" ? SUBJECT_LIST : [getSubject(scope)];
  const weakKeys =
    scope === "all"
      ? []
      : getSubject(scope)
          .topics.map((t) => topicKey(scope, t.id))
          .filter((k) => isWeak(masteryOf(topicStats[k])));

  function toggleTopic(key: string) {
    setSetup((c) => ({ ...c, topics: c.topics.includes(key) ? c.topics.filter((t) => t !== key) : [...c.topics, key] }));
  }

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link href="/grind" className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="size-3.5" aria-hidden /> All subjects
          </Link>
        }
        title={scope === "all" ? "Mixed grind" : `${getSubject(scope).name} grinder`}
        subtitle="Endless practice that drills your weakest topics first, brings missed questions back, and adapts difficulty to your level."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle>Focus</SectionTitle>
            <Segmented
              label="Mode"
              value={config.mode}
              onChange={(mode) => setConfig({ ...config, mode })}
              options={[
                { value: "weak", label: "Weak spots first", hint: "Weighted towards low-mastery, untested and stale topics" },
                { value: "shuffle", label: "Shuffle", hint: "Uniformly random from the selection" },
              ]}
            />

            {scope === "all" ? (
              <div className="mt-5">
                <div className="mb-2 text-sm font-medium">Subjects</div>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_LIST.map((s) => {
                    const on = config.subjects.includes(s.id);
                    return (
                      <Chip
                        key={s.id}
                        on={on}
                        onClick={() =>
                          setConfig({
                            ...config,
                            subjects: on ? config.subjects.filter((x) => x !== s.id) : [...config.subjects, s.id],
                          })
                        }
                      >
                        {s.name}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    Topics{" "}
                    <span className="font-normal text-ink-2">
                      {config.topics.length ? `(${config.topics.length} selected)` : "(all)"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setConfig({ ...config, topics: [] })}>
                      All
                    </Button>
                    <Button variant="ghost" size="sm" disabled={weakKeys.length === 0} onClick={() => setConfig({ ...config, topics: weakKeys })}>
                      Weak spots ({weakKeys.length})
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {topicsByUnit(subjects[0]).map(({ unit, topics }) => (
                    <div key={unit.id}>
                      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{unit.name}</div>
                      <div className="flex flex-wrap gap-2">
                        {topics.map((t) => {
                          const key = topicKey(scope, t.id);
                          const count = allQuestions.filter((q) => q.subject === scope && q.topic === t.id).length;
                          return (
                            <Chip
                              key={t.id}
                              on={config.topics.includes(key)}
                              disabled={count === 0}
                              onClick={() => toggleTopic(key)}
                              title={`${t.name} · ${count} question${count === 1 ? "" : "s"} · mastery ${pct(masteryOf(topicStats[key]))}`}
                            >
                              <span className="font-medium">{t.code}</span>
                              <span className="max-w-48 truncate">{t.name}</span>
                              <BandBadge mastery={masteryOf(topicStats[key])} className="sr-only" />
                            </Chip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle>Filters</SectionTitle>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-medium">Difficulty</div>
                <Segmented
                  label="Difficulty"
                  value={config.difficulty}
                  onChange={(difficulty) => setConfig({ ...config, difficulty })}
                  options={[
                    { value: 0, label: "Adaptive" },
                    { value: 1, label: "Easy" },
                    { value: 2, label: "Medium" },
                    { value: 3, label: "Hard" },
                  ]}
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Question types</div>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((t) => {
                    const on = config.types.includes(t.value);
                    return (
                      <Chip
                        key={t.value}
                        on={on}
                        onClick={() =>
                          setConfig({ ...config, types: on ? config.types.filter((x) => x !== t.value) : [...config.types, t.value] })
                        }
                      >
                        {t.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20 p-5">
            <div className="text-sm font-medium">Session length</div>
            <div className="mt-2">
              <Segmented
                label="Session length"
                value={config.length}
                onChange={(length) => updateSettings({ grindLength: length })}
                options={LENGTHS}
              />
            </div>
            <div className="mt-5 text-sm text-ink-2">
              <span className="tabular font-semibold text-ink">{pool.length}</span> question{pool.length === 1 ? "" : "s"} match
            </div>
            {pool.length === 0 ? (
              <p className="mt-3 text-sm text-ink-2">Nothing matches these filters yet. Widen the selection or add questions.</p>
            ) : (
              <Button size="lg" className="mt-4 w-full" onClick={() => startSession()}>
                <Zap className="size-5" aria-hidden />
                Start grinding
              </Button>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted">
              <Settings2 className="mr-1 inline size-3.5" aria-hidden />
              Missed questions return after {RETRY_GAP} others, and again later through spaced repetition.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Chip({
  on,
  children,
  className,
  ...props
}: ComponentProps<"button"> & { on: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        on ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink",
        className,
      )}
      {...props}
    >
      {on && <Check className="size-3.5 text-accent" aria-hidden />}
      {children}
    </button>
  );
}

function SessionSummary({ session, onAgain, onSetup }: { session: Session; onAgain: () => void; onSetup: () => void }) {
  const after = useProgress((s) => s.topics);
  const { answers } = session;
  const accuracy = answers.length ? answers.reduce((s, a) => s + a.score, 0) / answers.length : 0;
  const marks = answers.reduce((s, a) => s + a.question.marks, 0);
  const marksAwarded = answers.reduce((s, a) => s + a.marksAwarded, 0);

  const touched = [...new Set(answers.map((a) => topicKey(a.question.subject, a.question.topic)))].map((key) => {
    const [subject, topic] = key.split(":") as [SubjectId, string];
    return {
      key,
      subject,
      topic: getTopic(subject, topic),
      before: masteryOf(session.topicsBefore[key]),
      after: masteryOf(after[key]),
      n: answers.filter((a) => topicKey(a.question.subject, a.question.topic) === key).length,
    };
  });
  touched.sort((a, b) => (a.after ?? 0) - (b.after ?? 0));

  return (
    <div>
      <PageHeader
        title="Session complete"
        subtitle={`${answers.length} question${answers.length === 1 ? "" : "s"} · best streak ${session.bestStreak}`}
        actions={
          <>
            <Button variant="secondary" onClick={onSetup}>
              Change setup
            </Button>
            <Button onClick={onAgain}>
              <Flame className="size-4" aria-hidden /> Keep grinding
            </Button>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-ink-2">Accuracy</div>
          <div className="mt-1 text-2xl font-semibold tabular">{pct(accuracy)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-ink-2">Marks</div>
          <div className="mt-1 text-2xl font-semibold tabular">
            {marksAwarded}/{marks}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-ink-2">Topics practised</div>
          <div className="mt-1 text-2xl font-semibold tabular">{touched.length}</div>
        </Card>
      </div>

      <SectionTitle>Mastery after this session</SectionTitle>
      <Card className="divide-y divide-line">
        {touched.map((t) => {
          const delta = t.after !== null && t.before !== null ? t.after - t.before : null;
          return (
            <div key={t.key} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_260px_70px] sm:items-center sm:gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <SubjectIcon subject={t.subject} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm">
                    <span className="font-medium">{t.topic?.code}</span> {t.topic?.name}
                  </div>
                  <div className="text-xs text-muted tabular">
                    {t.n} question{t.n === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <MasteryBar mastery={t.after} />
              <div className="tabular text-right text-sm text-ink-2">
                {delta === null ? "new" : `${delta >= 0 ? "+" : "−"}${Math.abs(Math.round(delta * 100))} pts`}
              </div>
            </div>
          );
        })}
      </Card>
      {answers.length === 0 && <EmptyState title="No questions answered" />}
    </div>
  );
}
