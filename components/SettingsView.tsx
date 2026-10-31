"use client";

import { useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { Button, Card, PageHeader, PageSkeleton, Segmented, SectionTitle } from "@/components/ui";
import { useHydrated } from "@/lib/hydration";
import { exportProgress, useProgress } from "@/lib/store";
import { SUBJECT_LIST } from "@/lib/subjects";

export function SettingsView() {
  const hydrated = useHydrated();
  const settings = useProgress((s) => s.settings);
  const attempts = useProgress((s) => s.attempts.length);
  const updateSettings = useProgress((s) => s.updateSettings);
  const resetAll = useProgress((s) => s.resetAll);
  const resetSubject = useProgress((s) => s.resetSubject);
  const importData = useProgress((s) => s.importData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!hydrated) return <PageSkeleton />;

  function download() {
    const blob = new Blob([JSON.stringify(exportProgress(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ib-grind-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function upload(file: File) {
    try {
      importData(JSON.parse(await file.text()));
      setMessage("Backup restored.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't read that file.");
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />

      <Card className="mb-4 p-5">
        <SectionTitle>Exams</SectionTitle>
        <label className="block text-sm text-ink-2" htmlFor="exam-date">
          Date of your first IB exam (shows a countdown on the dashboard)
        </label>
        <input
          id="exam-date"
          type="date"
          value={settings.examDate ?? ""}
          onChange={(e) => updateSettings({ examDate: e.target.value || null })}
          className="mt-2 h-10 rounded-lg border border-line bg-page px-3 outline-none focus:border-accent"
        />
      </Card>

      <Card className="mb-4 p-5">
        <SectionTitle>Practice defaults</SectionTitle>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm text-ink-2">Familiarization test depth</div>
            <Segmented
              label="Familiarization test depth"
              value={settings.diagnosticDepth}
              onChange={(v) => updateSettings({ diagnosticDepth: v })}
              options={[
                { value: 1, label: "Quick" },
                { value: 2, label: "Standard" },
                { value: 3, label: "Thorough" },
              ]}
            />
          </div>
          <div>
            <div className="mb-2 text-sm text-ink-2">Grind session length</div>
            <Segmented
              label="Grind session length"
              value={settings.grindLength}
              onChange={(v) => updateSettings({ grindLength: v })}
              options={[
                { value: 10, label: "10" },
                { value: 20, label: "20" },
                { value: 40, label: "40" },
                { value: 0, label: "Endless" },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-4 p-5">
        <SectionTitle>Your data</SectionTitle>
        <p className="mb-4 text-sm text-ink-2">
          Progress (<span className="tabular">{attempts}</span> answers) is stored in this browser only. Download a backup to move it to another
          device or keep it safe.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={download}>
            <Download className="size-4" aria-hidden /> Download backup
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" aria-hidden /> Restore backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </div>
        {message && (
          <p className="mt-3 text-sm" role="status">
            {message}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle>Reset</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_LIST.map((s) => (
            <Button
              key={s.id}
              variant="secondary"
              size="sm"
              onClick={() => {
                if (confirm(`Reset all ${s.name} progress? This can't be undone.`)) resetSubject(s.id);
              }}
            >
              Reset {s.shortName}
            </Button>
          ))}
        </div>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => {
            if (confirm("Delete ALL progress, test results and settings? This can't be undone.")) resetAll();
          }}
        >
          <Trash2 className="size-4" aria-hidden /> Reset everything
        </Button>
      </Card>
    </div>
  );
}
