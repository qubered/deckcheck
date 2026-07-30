import type { ComparisonReport } from "@/lib/types";
import type { ReportFilter } from "@/lib/reportFilter";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const chipTone: Record<"neutral" | "warn" | "danger", string> = {
  neutral: "border-(--color-line-2) text-(--color-ink-2) hover:border-(--color-ink-2)",
  warn: "border-(--color-warn)/40 text-(--color-warn) hover:border-(--color-warn)",
  danger: "border-(--color-timeout)/40 text-(--color-timeout) hover:border-(--color-timeout)",
};

function FilterChip({
  label,
  count,
  tone,
  active,
  onClick,
}: {
  label: string;
  count: number;
  tone: "neutral" | "warn" | "danger";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-(--radius-pill) border px-3 py-1 text-xs font-semibold transition-colors",
        active ? "border-(--color-red) bg-(--color-red)/10 text-(--color-red)" : chipTone[tone],
      )}
    >
      {label} · {count}
    </button>
  );
}

/** Compact dashboard header for a report: one row of headline KPI tiles, plus a single line of
 * filter chips for the checks behind them. Every tile/chip doubles as a filter for the table below
 * — clicking one calls `onFilterChange`, and the active one is highlighted so the dashboard and
 * the table it's steering always agree on what's currently shown. */
export function ReportSummary({
  report,
  activeFilter,
  onFilterChange,
}: {
  report: ComparisonReport;
  activeFilter: ReportFilter;
  onFilterChange: (filter: ReportFilter) => void;
}) {
  const { rows } = report;
  const clean = rows.filter((r) => r.overallStatus === "match").length;
  const issues = rows.filter(
    (r) => r.overallStatus === "mismatch" || r.overallStatus === "partial" || r.overallStatus === "structural",
  ).length;

  const textIssues = rows.filter((r) => r.textMatch.status === "mismatch" || r.textMatch.status === "partial").length;
  const structural = rows.filter((r) => r.textMatch.status === "structural").length;
  const buildIssues = rows.filter((r) => r.buildMatch.status === "mismatch").length;
  // Auto-advance/autoplay present on every deck alike is normal, not a warning — like the other
  // "By check" chips, this counts only the cases where decks in the group actually disagree.
  const flagMismatches = rows.filter((r) => r.transitionFlag.status === "mismatch" || r.mediaFlag.status === "mismatch").length;

  function toggle(filter: ReportFilter) {
    onFilterChange(activeFilter === filter ? "all" : filter);
  }

  return (
    <Card className="mb-4 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Decks compared" value={report.summary.decksCompared} />
        <StatTile label="Clean" value={clean} tone="ok" onClick={() => toggle("clean")} active={activeFilter === "clean"} />
        <StatTile
          label="Issues"
          value={issues}
          tone={issues > 0 ? "danger" : "ok"}
          onClick={() => toggle("issues")}
          active={activeFilter === "issues"}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-(--color-line) pt-3">
        <span className="text-xs text-(--color-faint)">By check:</span>
        <FilterChip label="Text mismatches" count={textIssues} tone="danger" active={activeFilter === "text"} onClick={() => toggle("text")} />
        <FilterChip label="No counterpart" count={structural} tone="warn" active={activeFilter === "structural"} onClick={() => toggle("structural")} />
        <FilterChip label="Build mismatches" count={buildIssues} tone="danger" active={activeFilter === "build"} onClick={() => toggle("build")} />
        <FilterChip label="Auto-advance / autoplay" count={flagMismatches} tone="danger" active={activeFilter === "flags"} onClick={() => toggle("flags")} />
      </div>
    </Card>
  );
}
