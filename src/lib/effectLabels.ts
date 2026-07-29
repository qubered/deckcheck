import type { BuildStep } from "./types";

// ECMA-376 groups every build effect into one of these families via presetClass — not friendly
// names ("Fade", "Fly In"), but enough to describe what kind of animation is happening without
// showing raw codes like "entr:2" to the user.
const EFFECT_FAMILY_LABELS: Record<string, string> = {
  entr: "Entrance",
  exit: "Exit",
  emph: "Emphasis",
  path: "Motion path",
  verb: "Media action",
  media: "Media",
};

export function effectFamilyLabel(effectType: string | null): string {
  if (!effectType) return "Effect";
  const family = effectType.split(":")[0];
  return EFFECT_FAMILY_LABELS[family] ?? "Effect";
}

/** Short human-readable summary of a slide's build steps, e.g. "Entrance ×2, Exit". Empty string
 * if there are no builds at all — callers should render an explicit "No builds" in that case
 * rather than showing nothing, so builds/animations don't silently disappear from the report. */
export function summarizeBuildEffects(builds: BuildStep[]): string {
  if (builds.length === 0) return "";
  const counts = new Map<string, number>();
  for (const b of builds) {
    const label = effectFamilyLabel(b.effectType);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => (count > 1 ? `${label} ×${count}` : label))
    .join(", ");
}
