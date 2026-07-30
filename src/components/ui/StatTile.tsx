import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatTone = "ok" | "warn" | "danger" | "info" | "neutral";

const valueTone: Record<StatTone, string> = {
  ok: "text-(--color-ok)",
  warn: "text-(--color-warn)",
  danger: "text-(--color-timeout)",
  info: "text-(--color-module-show)",
  neutral: "text-(--color-ink)",
};

/** A single KPI tile for a summary dashboard row — a headline number plus a short label,
 * never color alone (the label always names what the number means). Renders as a button
 * (with a pressed/selected ring state) when `onClick` is given, so a dashboard tile can
 * double as a filter control; otherwise it's a plain presentational tile. */
export function StatTile({
  label,
  value,
  tone = "neutral",
  sublabel,
  icon,
  className,
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  tone?: StatTone;
  sublabel?: string;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("font-display text-2xl font-extrabold leading-none", valueTone[tone])}>{value}</div>
      {sublabel && <p className="truncate text-xs text-(--color-faint)">{sublabel}</p>}
    </>
  );

  const shared = cn(
    "flex min-w-0 flex-col gap-1 rounded-(--radius-md) border-2 bg-(--color-card) px-4 py-3 text-left",
    active ? "border-(--color-red)" : "border-(--color-line)",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(shared, "transition-colors hover:border-(--color-line-2)", active && "hover:border-(--color-red)")}
      >
        {content}
      </button>
    );
  }

  return <div className={shared}>{content}</div>;
}
