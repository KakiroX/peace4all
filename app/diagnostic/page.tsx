import type { Metadata } from "next";
import { SubjectPicker } from "@/components/SubjectPicker";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Familiarization test" };

export default function DiagnosticIndexPage() {
  return (
    <div>
      <PageHeader
        title="Familiarization test"
        subtitle="An adaptive test across the whole syllabus that ranks your weak spots. Take one per subject to start, then retake it every few weeks to see what's moved."
      />
      <SubjectPicker base="/diagnostic" />
    </div>
  );
}
