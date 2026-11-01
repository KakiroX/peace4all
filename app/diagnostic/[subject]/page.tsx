import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiagnosticRunner } from "@/components/DiagnosticRunner";
import { getSubject, isSubjectId } from "@/lib/subjects";
import { SUBJECT_IDS } from "@/lib/types";

export function generateStaticParams() {
  return SUBJECT_IDS.map((subject) => ({ subject }));
}

export async function generateMetadata({ params }: PageProps<"/diagnostic/[subject]">): Promise<Metadata> {
  const { subject } = await params;
  return { title: isSubjectId(subject) ? `${getSubject(subject).name} familiarization test` : "Not found" };
}

export default async function DiagnosticPage({ params }: PageProps<"/diagnostic/[subject]">) {
  const { subject } = await params;
  if (!isSubjectId(subject)) notFound();
  return <DiagnosticRunner subjectId={subject} />;
}
