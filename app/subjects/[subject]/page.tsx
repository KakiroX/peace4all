import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubjectView } from "@/components/SubjectView";
import { getSubject, isSubjectId } from "@/lib/subjects";
import { SUBJECT_IDS } from "@/lib/types";

export function generateStaticParams() {
  return SUBJECT_IDS.map((subject) => ({ subject }));
}

export async function generateMetadata({ params }: PageProps<"/subjects/[subject]">): Promise<Metadata> {
  const { subject } = await params;
  return { title: isSubjectId(subject) ? getSubject(subject).name : "Not found" };
}

export default async function SubjectPage({ params }: PageProps<"/subjects/[subject]">) {
  const { subject } = await params;
  if (!isSubjectId(subject)) notFound();
  return <SubjectView subjectId={subject} />;
}
