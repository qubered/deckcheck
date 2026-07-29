import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-(--radius-md) border-2 border-(--color-line) bg-(--color-paper-2) px-4 py-2.5 text-(--color-ink) placeholder:text-(--color-faint) outline-none transition-colors focus:border-(--color-red)";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "resize-none", className)} {...props} />;
}
