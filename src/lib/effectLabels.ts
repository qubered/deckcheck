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

/** Full build-step line for a slide, e.g. "2 builds — Entrance ×2" or "1 build, plays
 * automatically — Entrance". `buildClickCount` only counts steps that need a click to advance
 * (see `pptx-parser.ts`) — a slide can have builds that all fire automatically alongside the
 * previous step/slide, which would otherwise misleadingly read as "0 builds" despite having one. */
export function buildSummaryLine(builds: BuildStep[], buildClickCount: number): string {
  if (builds.length === 0) return "No builds";
  const effects = summarizeBuildEffects(builds);
  const s = builds.length === 1 ? "" : "s";
  if (buildClickCount === builds.length) return `${builds.length} build${s} — ${effects}`;
  if (buildClickCount === 0) return `${builds.length} build${s}, plays automatically — ${effects}`;
  const autoCount = builds.length - buildClickCount;
  return `${buildClickCount} click${buildClickCount === 1 ? "" : "s"} + ${autoCount} auto — ${effects}`;
}
