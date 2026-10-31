import { Atom, Briefcase, FlaskConical, Layers, Sigma, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { SUBJECTS } from "@/lib/subjects";
import type { SubjectId } from "@/lib/types";

const ICONS: Record<SubjectId, LucideIcon> = {
  "physics-hl": Atom,
  "math-aa-hl": Sigma,
  "chem-sl": FlaskConical,
  "bm-sl": Briefcase,
};

/** CSS variable for the subject's identity colour. */
export function subjectColor(id: SubjectId): string {
  return `var(--s${SUBJECTS[id].colorSlot})`;
}

export function SubjectIcon({ subject, size = "md" }: { subject: SubjectId | "all"; size?: "sm" | "md" | "lg" }) {
  const Icon = subject === "all" ? Layers : ICONS[subject];
  const color = subject === "all" ? "var(--ink-2)" : subjectColor(subject);
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" && "size-7",
        size === "md" && "size-9",
        size === "lg" && "size-12",
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      aria-hidden
    >
      <Icon className={clsx(size === "sm" ? "size-4" : size === "md" ? "size-5" : "size-6")} strokeWidth={2} />
    </span>
  );
}

export function SubjectDot({ subject }: { subject: SubjectId }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: subjectColor(subject) }} aria-hidden />;
}
