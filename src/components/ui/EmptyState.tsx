import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-(--radius-lg) border-2 border-dashed border-(--color-line) px-8 py-16 text-center">
      <div className="font-display text-xl font-bold text-(--color-ink)">{title}</div>
      {description && <p className="max-w-md text-(--color-muted)">{description}</p>}
      {action}
    </div>
  );
}
