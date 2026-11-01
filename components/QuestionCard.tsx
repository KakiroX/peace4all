"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Calculator, Check, CircleHelp, Eye, X } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { SubjectIcon } from "@/components/SubjectIcon";
import { Button, Card } from "@/components/ui";
import { formatAnswer, grade } from "@/lib/grading";
import { getSubject, getTopic } from "@/lib/subjects";
import type { GradeResult, Question, Response } from "@/lib/types";

export interface AnswerEvent {
  response: Response;
  grade: GradeResult;
  timeMs: number;
}

const DIFFICULTY_LABEL = { 1: "Easy", 2: "Medium", 3: "Hard" } as const;
const LETTERS = "ABCDEFGH";

function isTypingTarget(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

function DifficultyPips({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`Difficulty: ${DIFFICULTY_LABEL[level]}`}>
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={clsx("h-2.5 w-1.5 rounded-sm", i <= level ? "bg-ink-2" : "bg-line")} />
        ))}
      </span>
      {DIFFICULTY_LABEL[level]}
    </span>
  );
}

export function QuestionMeta({ question, badge }: { question: Question; badge?: ReactNode }) {
  const subject = getSubject(question.subject);
  const topic = getTopic(question.subject, question.topic);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
      <span className="flex min-w-0 items-center gap-2">
        <SubjectIcon subject={question.subject} size="sm" />
        <span className="min-w-0 truncate">
          <span className="font-medium text-ink">{topic?.code}</span> {topic?.name}
          <span className="sr-only"> ({subject.name})</span>
        </span>
      </span>
      <DifficultyPips level={question.difficulty} />
      <span className="tabular">
        {question.marks} mark{question.marks === 1 ? "" : "s"}
      </span>
      {question.calculator === false && (
        <span className="inline-flex items-center gap-1">
          <Calculator className="size-3.5" aria-hidden />
          No calculator
        </span>
      )}
      {badge}
    </div>
  );
}

export function QuestionCard({
  question,
  onAnswered,
  onNext,
  allowSkip = false,
  skipLabel = "I don't know",
  nextLabel = "Next question",
  badge,
}: {
  question: Question;
  onAnswered: (e: AnswerEvent) => void;
  onNext: () => void;
  allowSkip?: boolean;
  skipLabel?: string;
  nextLabel?: string;
  badge?: ReactNode;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [raw, setRaw] = useState("");
  const [text, setText] = useState("");
  const [showMarkscheme, setShowMarkscheme] = useState(false);
  const [result, setResult] = useState<{ response: Response; grade: GradeResult } | null>(null);
  const started = useRef(0);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    started.current = Date.now();
  }, []);

  const done = result !== null;

  function submit(response: Response) {
    if (done) return;
    const g = grade(question, response);
    setResult({ response, grade: g });
    onAnswered({ response, grade: g, timeMs: Date.now() - started.current });
  }

  // Focus "Next" once answered so Enter moves on.
  useEffect(() => {
    if (done) nextRef.current?.focus();
  }, [done]);

  // Keyboard shortcuts for multiple choice: 1-4 / A-D to pick, Enter to submit.
  useEffect(() => {
    if (question.type !== "mcq" || done) return;
    const options = question.options.length;
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      const idx = /^[1-9]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k);
      if (idx >= 0 && idx < options) {
        e.preventDefault();
        setChoice(idx);
      } else if (e.key === "Enter" && choice !== null) {
        e.preventDefault();
        submit({ kind: "mcq", choice });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-3 sm:px-6">
        <QuestionMeta question={question} badge={badge} />
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <Markdown className="text-[1.05rem]">{question.prompt}</Markdown>

        {/* ---- Multiple choice ---- */}
        {question.type === "mcq" && (
          <div className="mt-6 grid gap-2" role="radiogroup" aria-label="Options">
            {question.options.map((opt, i) => {
              const isCorrect = i === question.answer;
              const isChosen = done ? result.response.kind === "mcq" && result.response.choice === i : choice === i;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={isChosen}
                  disabled={done}
                  onClick={() => setChoice(i)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    !done && (isChosen ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"),
                    done && isCorrect && "border-good bg-[color-mix(in_srgb,var(--good)_10%,transparent)]",
                    done && !isCorrect && isChosen && "border-critical bg-[color-mix(in_srgb,var(--critical)_8%,transparent)]",
                    done && !isCorrect && !isChosen && "border-line opacity-70",
                  )}
                >
                  <span
                    className={clsx(
                      "flex size-7 shrink-0 items-center justify-center rounded-md border text-sm font-semibold",
                      isChosen && !done ? "border-accent bg-accent text-on-accent" : "border-line-strong text-ink-2",
                    )}
                  >
                    {LETTERS[i]}
                  </span>
                  <Markdown inline className="flex-1">
                    {opt}
                  </Markdown>
                  {done && isCorrect && <Check className="size-5 shrink-0 text-good" aria-label="Correct answer" />}
                  {done && !isCorrect && isChosen && <X className="size-5 shrink-0 text-critical" aria-label="Your answer" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ---- Numeric ---- */}
        {question.type === "numeric" && (
          <form
            className="mt-6 flex flex-wrap items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (raw.trim()) submit({ kind: "numeric", raw });
            }}
          >
            <label className="sr-only" htmlFor={`ans-${question.id}`}>
              Your answer
            </label>
            <input
              id={`ans-${question.id}`}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              disabled={done}
              autoComplete="off"
              inputMode="text"
              placeholder="Your answer, e.g. 3.2e5 or 7/9"
              className="h-11 w-64 max-w-full rounded-lg border border-line bg-page px-3 text-base tabular outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-80"
            />
            {question.units && <span className="text-ink-2">{question.units}</span>}
            {!done && (
              <Button type="submit" disabled={!raw.trim()}>
                Check
              </Button>
            )}
          </form>
        )}

        {/* ---- Written (self-marked) ---- */}
        {question.type === "written" && (
          <div className="mt-6">
            <label className="mb-1.5 block text-sm text-ink-2" htmlFor={`ans-${question.id}`}>
              Write your answer as you would in the exam (optional, it isn&apos;t sent anywhere)
            </label>
            <textarea
              id={`ans-${question.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={done}
              rows={5}
              className="w-full rounded-lg border border-line bg-page px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-80"
            />
            {!showMarkscheme && !done && (
              <Button className="mt-3" onClick={() => setShowMarkscheme(true)}>
                <Eye className="size-4" aria-hidden />
                Show markscheme
              </Button>
            )}
            {(showMarkscheme || done) && (
              <div className="mt-4 rounded-lg border border-line bg-page p-4">
                <div className="mb-2 text-sm font-semibold">Markscheme</div>
                <Markdown>{question.markscheme}</Markdown>
              </div>
            )}
            {showMarkscheme && !done && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-medium">Be honest: how many marks did you earn?</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: question.marks + 1 }, (_, m) => (
                    <Button key={m} variant="secondary" className="tabular min-w-12" onClick={() => submit({ kind: "written", text, awarded: m })}>
                      {m}/{question.marks}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- Primary actions before answering ---- */}
        {!done && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {question.type === "mcq" && (
              <Button disabled={choice === null} onClick={() => choice !== null && submit({ kind: "mcq", choice })}>
                Check
              </Button>
            )}
            {allowSkip && (
              <Button variant="ghost" onClick={() => submit({ kind: "skip" })}>
                <CircleHelp className="size-4" aria-hidden />
                {skipLabel}
              </Button>
            )}
            {question.type === "mcq" && (
              <span className="hidden text-xs text-muted sm:inline">Tip: press A–D (or 1–4), then Enter</span>
            )}
          </div>
        )}
      </div>

      {/* ---- Feedback ---- */}
      {done && (
        <div className="border-t border-line bg-page px-5 py-5 sm:px-6" aria-live="polite">
          <Feedback question={question} result={result} />
          <div className="mt-5">
            <Button ref={nextRef} onClick={onNext}>
              {nextLabel}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Feedback({ question, result }: { question: Question; result: { response: Response; grade: GradeResult } }) {
  const { grade: g, response } = result;
  const skipped = response.kind === "skip";
  const tone = skipped ? "skip" : g.correct ? "good" : g.score > 0 ? "partial" : "bad";

  const heading = {
    skip: "Skipped. Here's how it's done",
    good: "Correct",
    partial: `Partially correct (${g.marksAwarded}/${question.marks})`,
    bad: "Not quite",
  }[tone];

  const Icon = tone === "good" ? Check : tone === "skip" ? CircleHelp : X;
  const iconColor = tone === "good" ? "var(--good)" : tone === "partial" ? "var(--warning)" : tone === "skip" ? "var(--muted)" : "var(--critical)";

  return (
    <div>
      <div className="flex items-center gap-2 font-semibold">
        <Icon className="size-5" style={{ color: iconColor }} aria-hidden />
        {heading}
        {question.type === "written" && !skipped && (
          <span className="tabular font-normal text-ink-2">
            · {g.marksAwarded}/{question.marks} marks
          </span>
        )}
      </div>
      {g.note && <p className="mt-1 text-sm text-ink-2">{g.note}</p>}
      {question.type === "numeric" && (
        <p className="mt-2 text-sm">
          <span className="text-ink-2">Answer: </span>
          <span className="tabular font-medium">
            {formatAnswer(question.answer)}
            {question.units ? ` ${question.units}` : ""}
          </span>
          {response.kind === "numeric" && (
            <>
              <span className="text-ink-2"> · You wrote: </span>
              <span className="tabular">{response.raw}</span>
            </>
          )}
        </p>
      )}
      {question.explanation && (
        <div className="mt-3 text-[0.98rem]">
          <Markdown>{question.explanation}</Markdown>
        </div>
      )}
      {question.source && <p className="mt-3 text-xs text-muted">Source: {question.source}</p>}
    </div>
  );
}
