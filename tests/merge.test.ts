import { describe, expect, it } from "vitest";
import { deriveStats, groupByDay, mergeAttempts, mergeSynced, newAttempts, resetsAdvanced } from "@/lib/merge";
import { updateTopicStat } from "@/lib/mastery";
import { DEFAULT_SETTINGS, type DiagnosticRecord, type SyncedData } from "@/lib/store";
import type { Attempt } from "@/lib/types";

const att = (at: number, questionId = "phys-sample-001", score = 1, subject: Attempt["subject"] = "physics-hl"): Attempt => ({
  questionId,
  subject,
  topic: subject === "physics-hl" ? "A.1" : "S1.3",
  score,
  marksAwarded: score,
  marks: 1,
  skipped: false,
  mode: "grind",
  timeMs: 1000,
  at,
});

const diag = (id: string, finishedAt: number, subject: DiagnosticRecord["subject"] = "physics-hl"): DiagnosticRecord => ({
  id,
  subject,
  startedAt: finishedAt - 1,
  finishedAt,
  depth: 2,
  questions: 1,
  marks: 1,
  marksAwarded: 1,
  topics: [],
});

const data = (patch: Partial<SyncedData> = {}): SyncedData => ({
  attempts: [],
  diagnostics: [],
  settings: { ...DEFAULT_SETTINGS },
  settingsUpdatedAt: 0,
  resets: {},
  resetsUpdatedAt: 0,
  ...patch,
});

describe("mergeAttempts", () => {
  it("unions by (time, question) and sorts by time", () => {
    const merged = mergeAttempts([att(3), att(1)], [att(1), att(2)]);
    expect(merged.map((a) => a.at)).toEqual([1, 2, 3]);
  });
});

describe("deriveStats", () => {
  it("matches incremental updates", () => {
    const attempts = [att(1, "phys-sample-001", 1), att(2, "phys-sample-001", 0), att(3, "phys-sample-001", 1)];
    let expected = undefined;
    for (const a of attempts) expected = updateTopicStat(expected, a.score, 1, a.at); // sample-001 is difficulty 1
    expect(deriveStats(attempts).topics["physics-hl:A.1"]).toEqual(expected);
    expect(deriveStats(attempts).questions["phys-sample-001"].n).toBe(3);
  });
});

describe("newAttempts", () => {
  it("returns the appended answer on the fast path", () => {
    const a = [att(1), att(2)];
    const b = [...a, att(3)];
    expect(newAttempts(a, b)).toEqual([att(3)]);
  });
  it("handles the local cap dropping the oldest", () => {
    const a = [att(1), att(2)];
    const b = [a[1], att(3)];
    expect(newAttempts(a, b).map((x) => x.at)).toEqual([3]);
  });
  it("finds older answers merged into the middle", () => {
    const a = [att(5)];
    const b = mergeAttempts(a, [att(1), att(9)]);
    expect(newAttempts(a, b).map((x) => x.at).sort()).toEqual([1, 9]);
  });
});

describe("mergeSynced", () => {
  it("combines two devices and uploads only what the server lacks", () => {
    const local = data({ attempts: [att(1), att(3)], diagnostics: [diag("d1", 10)] });
    const remote = data({ attempts: [att(1), att(2)], diagnostics: [diag("d2", 20)] });
    const r = mergeSynced(local, remote);
    expect(r.data.attempts.map((a) => a.at)).toEqual([1, 2, 3]);
    expect(r.data.diagnostics.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(r.uploadAttempts.map((a) => a.at)).toEqual([3]);
    expect(r.uploadProfile).toBe(true); // d1 is new to the server
    expect(r.remoteNeedsRewrite).toBe(false);
  });

  it("takes the newer settings", () => {
    const local = data({ settings: { ...DEFAULT_SETTINGS, grindLength: 10 }, settingsUpdatedAt: 5 });
    const remote = data({ settings: { ...DEFAULT_SETTINGS, grindLength: 40 }, settingsUpdatedAt: 9 });
    expect(mergeSynced(local, remote).data.settings.grindLength).toBe(40);
    expect(mergeSynced(local, remote).uploadProfile).toBe(false);
    expect(mergeSynced(remote, local).data.settings.grindLength).toBe(40);
    expect(mergeSynced(remote, local).uploadProfile).toBe(true);
  });

  it("applies a reset made on another device", () => {
    const local = data({ attempts: [att(1), att(2, "chem-sample-001", 1, "chem-sl")] });
    const remote = data({ resets: { "physics-hl": 5 }, resetsUpdatedAt: 5 });
    const r = mergeSynced(local, remote);
    expect(r.data.attempts.map((a) => a.subject)).toEqual(["chem-sl"]);
    expect(r.uploadAttempts.map((a) => a.subject)).toEqual(["chem-sl"]);
  });

  it("asks for a server rewrite when a local reset hides server data", () => {
    const local = data({ resets: { all: 100 }, resetsUpdatedAt: 100 });
    const remote = data({ attempts: [att(1)], diagnostics: [diag("old", 50)] });
    const r = mergeSynced(local, remote);
    expect(r.data.attempts).toEqual([]);
    expect(r.data.diagnostics).toEqual([]);
    expect(r.remoteNeedsRewrite).toBe(true);
  });

  it("keeps answers made after a reset", () => {
    const r = mergeSynced(data({ attempts: [att(200)] }), data({ attempts: [att(1)], resets: { all: 100 }, resetsUpdatedAt: 100 }));
    expect(r.data.attempts.map((a) => a.at)).toEqual([200]);
  });
});

describe("helpers", () => {
  it("detects forward-moving reset markers only", () => {
    expect(resetsAdvanced({}, { all: 1 })).toBe(true);
    expect(resetsAdvanced({ all: 5 }, {})).toBe(false);
    expect(resetsAdvanced({ "bm-sl": 5 }, { "bm-sl": 5 })).toBe(false);
  });
  it("groups by local day", () => {
    const day = new Date(2026, 9, 31, 12).getTime();
    const groups = groupByDay([att(day), att(day + 1000), att(day + 86_400_000)]);
    expect([...groups.keys()]).toEqual(["2026-10-31", "2026-11-01"]);
  });
});
