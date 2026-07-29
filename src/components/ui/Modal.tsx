import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-(--radius-lg) border-2 border-(--color-line-2) bg-(--color-card) p-6 shadow-[var(--shadow-hover)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="mb-4 font-display text-lg font-bold text-(--color-ink)">{title}</h2>
        {children}
      </div>
    </div>
  );
}
