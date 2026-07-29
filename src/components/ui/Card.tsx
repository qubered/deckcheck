import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-(--radius-md) border-2 border-(--color-line) bg-(--color-card) shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}
