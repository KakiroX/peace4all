import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-10">
      <EmptyState title="Page not found">That page doesn&apos;t exist.</EmptyState>
      <div className="mt-6 flex justify-center">
        <ButtonLink href="/">Back to dashboard</ButtonLink>
      </div>
    </div>
  );
}
