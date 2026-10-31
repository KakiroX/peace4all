"use client";

import { useState } from "react";
import { pct } from "@/components/Mastery";
import type { DayActivity } from "@/lib/stats";

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  for (const s of steps) if (v <= s) return s;
  return Math.ceil(v / 1000) * 1000;
}

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

/** Questions answered per day: single series column chart with hover tooltips and a table view. */
export function ActivityChart({ data, title = "Questions answered per day" }: { data: DayActivity[]; title?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.count)));
  const ticks = [max, max / 2, 0];
  const H = 140;

  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      <div className="flex gap-2">
        {/* y-axis */}
        <div className="tabular relative w-7 shrink-0 text-right text-[11px] text-muted" style={{ height: H }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: H - (t / max) * H }}>
              {t}
            </span>
          ))}
        </div>
        {/* plot */}
        <div className="relative flex-1" style={{ height: H }}>
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 h-px"
              style={{ top: H - (t / max) * H, backgroundColor: t === 0 ? "var(--baseline)" : "var(--grid)" }}
              aria-hidden
            />
          ))}
          <div className="absolute inset-0 flex items-end">
            {data.map((d, i) => (
              <div
                key={d.key}
                tabIndex={0}
                role="img"
                aria-label={`${fmtDay(d.date)}: ${d.count} questions${d.accuracy !== null ? `, ${pct(d.accuracy)} accuracy` : ""}`}
                className="relative flex h-full flex-1 cursor-default items-end justify-center outline-none focus-visible:bg-surface-2"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                {d.count > 0 && (
                  <div
                    className="w-full max-w-6 rounded-t"
                    style={{
                      height: Math.max(2, (d.count / max) * H),
                      backgroundColor: "var(--bar)",
                      opacity: hover === null || hover === i ? 1 : 0.55,
                      marginInline: 1,
                    }}
                  />
                )}
                {hover === i && (
                  <div
                    className="pointer-events-none absolute bottom-full z-10 mb-2 w-max rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
                    style={{ left: "50%", transform: `translateX(${i < 2 ? "-20%" : i > data.length - 3 ? "-80%" : "-50%"})` }}
                  >
                    <div className="font-medium text-ink">{fmtDay(d.date)}</div>
                    <div className="tabular text-ink-2">
                      {d.count} question{d.count === 1 ? "" : "s"}
                      {d.accuracy !== null && ` · ${pct(d.accuracy)} accuracy`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* x-axis: first, middle, last */}
      <div className="tabular ml-9 mt-1.5 flex justify-between text-[11px] text-muted" aria-hidden>
        <span>{fmtDay(data[0].date)}</span>
        <span>Today</span>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">Show as table</summary>
        <table className="tabular mt-2 w-full text-left text-sm">
          <thead className="text-ink-2">
            <tr>
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Questions</th>
              <th className="py-1 text-right font-medium">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-line">
                <td className="py-1">{fmtDay(d.date)}</td>
                <td className="py-1 text-right">{d.count}</td>
                <td className="py-1 text-right">{pct(d.accuracy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
