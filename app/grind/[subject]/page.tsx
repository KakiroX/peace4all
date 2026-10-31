import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Grinder } from "@/components/Grinder";
import { PageSkeleton } from "@/components/ui";
import { getSubject, isSubjectId } from "@/lib/subjects";
import { SUBJECT_IDS } from "@/lib/types";

export function generateStaticParams() {
  return [...SUBJECT_IDS, "all"].map((subject) => ({ subject }));
}

export async function generateMetadata({ params }: PageProps<"/grind/[subject]">): Promise<Metadata> {
  const { subject } = await params;
  if (subject === "all") return { title: "Mixed grind" };
  return { title: isSubjectId(subject) ? `${getSubject(subject).name} grinder` : "Not found" };
}

export default async function GrindPage({ params }: PageProps<"/grind/[subject]">) {
  const { subject } = await params;
  if (subject !== "all" && !isSubjectId(subject)) notFound();
  return (
    // Grinder reads ?topics=… from the URL, which is only known in the browser.
    <Suspense fallback={<PageSkeleton />}>
      <Grinder scope={subject} />
    </Suspense>
  );
}
