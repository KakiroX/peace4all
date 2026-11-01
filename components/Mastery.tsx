import { AlertTriangle, CircleDashed, CircleCheck, OctagonAlert, Trophy, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { BAND_LABEL, bandOf, type Band } from "@/lib/mastery";

export const BAND_COLOR: Record<Band, string> = {
  untested: "var(--line-strong)",
  weak: "var(--critical)",
  shaky: "var(--warning)",
  solid: "var(--solid)",
  mastered: "var(--mastered)",
};

const BAND_ICON: Record<Band, LucideIcon> = {
  untested: CircleDashed,
  weak: OctagonAlert,
  shaky: AlertTriangle,
  solid: CircleCheck,
  mastered: Trophy,
};

export function pct(x: number | null | undefined): string {
  return x === null || x === undefined ? "–" : `${Math.round(x * 100)}%`;
}

/** Status is never colour-alone: icon + label, ink text. */
export function BandBadge({ mastery, className }: { mastery: number | null; className?: string }) {
  const band = bandOf(mastery);
  const Icon = BAND_ICON[band];
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs font-medium text-ink-2", className)}>
      <Icon className="size-3.5" style={{ color: BAND_COLOR[band] }} aria-hidden />
      {BAND_LABEL[band]}
    </span>
  );
}

/** Horizontal mastery meter with value + band label in ink. */
export function MasteryBar({ mastery, compact = false }: { mastery: number | null; compact?: boolean }) {
  const band = bandOf(mastery);
  return (
    <div className="flex items-center gap-3">
      <div
        className={clsx("relative flex-1 overflow-hidden rounded-full bg-surface-2", compact ? "h-1.5" : "h-2")}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={mastery === null ? undefined : Math.round(mastery * 100)}
        aria-label="Mastery"
      >
        {mastery !== null && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${Math.max(3, mastery * 100)}%`, backgroundColor: BAND_COLOR[band] }}
          />
        )}
      </div>
      <span className="tabular w-10 text-right text-sm font-medium">{pct(mastery)}</span>
      {!compact && <BandBadge mastery={mastery} className="w-20" />}
    </div>
  );
}
