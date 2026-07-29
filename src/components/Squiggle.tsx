import type { ReactNode } from "react";

export function Squiggle({ className, color = "var(--color-red)" }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 200 16"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 10 Q 15 1, 28 10 T 54 10 T 80 10 T 106 10 T 132 10 T 158 10 T 184 10"
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A loose, hand-drawn-looking curved arrow — for a casual "psst, click this" nudge near a CTA. */
export function DoodleArrow({ className, color = "var(--color-ink-2)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 80 60" className={className} aria-hidden="true">
      <path
        d="M6 6 C 30 4, 55 14, 62 34 C 64 40, 62 45, 58 48"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M48 44 L 58 48 L 56 37" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A small rotated die-cut "sticker" badge — design-language pattern for hero/CTA decoration:
 * bold categorical color, cream border, hard offset shadow, slight rotation. */
export function Sticker({
  children,
  color,
  textColor = "var(--color-cream)",
  rotate = -4,
  className,
}: {
  children: ReactNode;
  color: string;
  /** Categorical fills vary in brightness (amber is much lighter than blue/purple) — pass a
   * darker textColor for light fills so the label stays readable. */
  textColor?: string;
  rotate?: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-(--radius-md) border-[3px] border-(--color-cream) px-3 py-1.5 text-sm font-bold ${className ?? ""}`}
      style={{
        background: color,
        color: textColor,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "3px 4px 0 rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}
