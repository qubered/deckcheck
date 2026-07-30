import type { ComparisonReport } from "@/lib/types";
import type { ReportFilter } from "@/lib/reportFilter";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";

/** Dashboard header for a report: headline KPI tiles, a composition bar (clean / flagged /
 * issues), and a breakdown of issues by check. Every tile doubles as a filter control for the
 * table below it — clicking one calls `onFilterChange`, and the active filter gets a ring so the
 * dashboard and the table it's steering always agree on what's currently shown. */
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
  const total = rows.length;
  const clean = rows.filter((r) => r.overallStatus === "match").length;
  const info = rows.filter((r) => r.overallStatus === "info").length;
  const issues = rows.filter(
    (r) => r.overallStatus === "mismatch" || r.overallStatus === "partial" || r.overallStatus === "structural",
  ).length;

  const textIssues = rows.filter((r) => r.textMatch.status === "mismatch" || r.textMatch.status === "partial").length;
  const structural = rows.filter((r) => r.textMatch.status === "structural").length;
  const buildIssues = rows.filter((r) => r.buildMatch.status === "mismatch").length;
  const flags = rows.filter((r) => r.transitionFlag.present || r.mediaFlag.present).length;

  const cleanPct = total > 0 ? (clean / total) * 100 : 0;
  const infoPct = total > 0 ? (info / total) * 100 : 0;
  const issuesPct = total > 0 ? (issues / total) * 100 : 0;

  function toggle(filter: ReportFilter) {
    onFilterChange(activeFilter === filter ? "all" : filter);
  }

  return (
    <Card className="mb-6 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Decks compared" value={report.summary.decksCompared} />
        <StatTile
          label="Clean slides"
          value={clean}
          tone="ok"
          sublabel={total > 0 ? `${Math.round(cleanPct)}% of ${total}` : undefined}
          onClick={() => toggle("clean")}
          active={activeFilter === "clean"}
        />
        <StatTile
          label="Flagged"
          value={info}
          tone="info"
          sublabel="Informational only"
          onClick={() => toggle("info")}
          active={activeFilter === "info"}
        />
        <StatTile
          label="Issues"
          value={issues}
          tone={issues > 0 ? "danger" : "ok"}
          sublabel="Needs attention"
          onClick={() => toggle("issues")}
          active={activeFilter === "issues"}
        />
      </div>

      {total > 0 && (
        <div className="mt-4">
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-(--radius-pill) bg-(--color-paper-2)">
            {cleanPct > 0 && (
              <div
                className="h-full rounded-(--radius-pill) bg-(--color-ok)"
                style={{ width: `${cleanPct}%` }}
                title={`Clean: ${clean} slide${clean === 1 ? "" : "s"}`}
              />
            )}
            {infoPct > 0 && (
              <div
                className="h-full rounded-(--radius-pill) bg-(--color-module-show)"
                style={{ width: `${infoPct}%` }}
                title={`Flagged: ${info} slide${info === 1 ? "" : "s"}`}
              />
            )}
            {issuesPct > 0 && (
              <div
                className="h-full rounded-(--radius-pill) bg-(--color-timeout)"
                style={{ width: `${issuesPct}%` }}
                title={`Issues: ${issues} slide${issues === 1 ? "" : "s"}`}
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--color-muted)">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-(--color-ok)" /> Clean
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-(--color-module-show)" /> Flagged
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-(--color-timeout)" /> Issues
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-(--color-line) pt-4 sm:grid-cols-4">
        <StatTile
          label="Text mismatches"
          value={textIssues}
          tone={textIssues > 0 ? "danger" : "neutral"}
          onClick={() => toggle("text")}
          active={activeFilter === "text"}
        />
        <StatTile
          label="No counterpart"
          value={structural}
          tone={structural > 0 ? "warn" : "neutral"}
          onClick={() => toggle("structural")}
          active={activeFilter === "structural"}
        />
        <StatTile
          label="Build mismatches"
          value={buildIssues}
          tone={buildIssues > 0 ? "danger" : "neutral"}
          onClick={() => toggle("build")}
          active={activeFilter === "build"}
        />
        <StatTile
          label="Auto-advance / autoplay"
          value={flags}
          tone={flags > 0 ? "warn" : "neutral"}
          onClick={() => toggle("flags")}
          active={activeFilter === "flags"}
        />
      </div>
    </Card>
  );
}
