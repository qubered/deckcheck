import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "danger" | "cream";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-(--radius-pill) px-5 py-2.5 font-body font-semibold text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-red) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-paper) disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-(--color-red) text-white shadow-[var(--shadow-card)] hover:-translate-y-px hover:shadow-[var(--shadow-hover)] active:translate-y-0.5 active:shadow-none",
  danger:
    "bg-(--color-timeout) text-white shadow-[var(--shadow-card)] hover:-translate-y-px hover:shadow-[var(--shadow-hover)] active:translate-y-0.5 active:shadow-none",
  outline:
    "border-2 border-(--color-line-2) text-(--color-ink) bg-transparent hover:bg-(--color-ink) hover:text-(--color-paper)",
  ghost: "text-(--color-ink-2) hover:text-(--color-red) bg-transparent",
  // Fixed cream fill, reserved for buttons sitting on a solid red block (a closing CTA band) —
  // never used elsewhere, per the design language's button hierarchy.
  cream:
    "bg-(--color-cream) text-(--color-red) shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:-translate-y-px active:translate-y-0.5 active:shadow-none",
};

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
