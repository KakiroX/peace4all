import type { Metadata } from "next";
import { SubjectPicker } from "@/components/SubjectPicker";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Grinder" };

export default function GrindIndexPage() {
  return (
    <div>
      <PageHeader
        title="Grinder"
        subtitle="Endless adaptive practice. It goes after your weakest topics first, brings back what you missed, and keeps the difficulty just above comfortable."
      />
      <SubjectPicker base="/grind" includeAll />
    </div>
  );
}
