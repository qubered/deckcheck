import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "ok" | "warn" | "danger" | "info" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  ok: "bg-(--color-ok)/15 text-(--color-ok) border-(--color-ok)/40",
  warn: "bg-(--color-warn)/15 text-(--color-warn) border-(--color-warn)/40",
  danger: "bg-(--color-timeout)/15 text-(--color-timeout) border-(--color-timeout)/40",
  info: "bg-(--color-module-show)/15 text-(--color-module-show) border-(--color-module-show)/40",
  neutral: "bg-(--color-elevation) text-(--color-ink-2) border-(--color-line-2)",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-(--radius-pill) border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
