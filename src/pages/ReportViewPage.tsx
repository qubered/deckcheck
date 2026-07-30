import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { db } from "@/lib/db";
import { reportToCsv, downloadCsv } from "@/lib/csv";
import { buildSummaryLine } from "@/lib/effectLabels";
import { rowMatchesFilter, rowMatchesSearch, type ReportFilter } from "@/lib/reportFilter";
import type { MatchStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/StatusBadge";
import { ReportSummary } from "@/components/ReportSummary";
import { SlideNavigator } from "@/components/SlideNavigator";

const rowBorderTone: Record<MatchStatus, string> = {
  match: "border-l-transparent",
  partial: "border-l-(--color-warn)",
  structural: "border-l-(--color-warn)",
  mismatch: "border-l-(--color-timeout)",
};

// Colored by the row's overall status, not just text similarity — a slide can be 100% text-match
// and still be mismatched (different build/click count, autoplay media, auto-advance), and a big
// green number in the most eye-catching column on the row would bury that. Tying the color to
// `overallStatus` means the number can only ever look "all good" when the row actually is.
function matchCellTone(status: MatchStatus): string {
  if (status === "mismatch") return "text-(--color-timeout)";
  if (status === "partial" || status === "structural") return "text-(--color-warn)";
  return "text-(--color-ok)";
}

export function ReportViewPage() {
  const { showId, reportId } = useParams<{ showId: string; reportId: string }>();
  const report = useLiveQuery(() => db.reports.get(reportId!), [reportId]);

  const [activeFilter, setActiveFilter] = useState<ReportFilter>("all");
  const [search, setSearch] = useState("");
  const [issueCursor, setIssueCursor] = useState(0);
  const [scrollTarget, setScrollTarget] = useState<number | null>(null);

  const fullReport = report?.fullReport;

  const issueRows = useMemo(
    () => (fullReport ? fullReport.rows.filter((r) => rowMatchesFilter(r, "issues")) : []),
    [fullReport],
  );

  const visibleRows = useMemo(
    () =>
      fullReport
        ? fullReport.rows.filter((r) => rowMatchesFilter(r, activeFilter) && rowMatchesSearch(r, search))
        : [],
    [fullReport, activeFilter, search],
  );

  useEffect(() => {
    if (scrollTarget === null) return;
    const el = document.getElementById(`row-${scrollTarget}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el) {
      el.classList.add("ring-2", "ring-(--color-red)");
      const t = setTimeout(() => el.classList.remove("ring-2", "ring-(--color-red)"), 1200);
      setScrollTarget(null);
      return () => clearTimeout(t);
    }
    setScrollTarget(null);
  }, [scrollTarget, activeFilter, search]);

  if (report === undefined) return null;
  if (report === null || !fullReport) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-(--color-muted)">Report not found.</p>
      </div>
    );
  }

  function handleExport() {
    const csv = reportToCsv(fullReport!);
    const safeName = (report!.runLabel || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCsv(`deckcheck-${safeName}.csv`, csv);
  }

  function jumpToIssue(direction: 1 | -1) {
    if (issueRows.length === 0) return;
    const next = (issueCursor + direction + issueRows.length) % issueRows.length;
    setIssueCursor(next);
    setActiveFilter("issues");
    setSearch("");
    setScrollTarget(issueRows[next].slideIndex);
  }

  const hasActiveFilter = activeFilter !== "all" || search.trim() !== "";

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 print:max-w-full print:p-0">
      <Link
        to={`/app/shows/${showId}`}
        className="mb-4 inline-block text-sm text-(--color-muted) hover:text-(--color-red) print:hidden"
      >
        ← Back to show
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-(--color-ink)">
            {report.runLabel || new Date(report.createdAt).toLocaleString()}
          </h1>
          <p className="mt-1 text-sm text-(--color-muted)">
            {new Date(report.createdAt).toLocaleString()} · {fullReport.decks.length} decks ·{" "}
            {fullReport.summary.totalAlignedSlides} slides compared
          </p>
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
          <Button variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        {fullReport.decks.map((d) => (
          <Badge key={d.deckId} tone="neutral">
            {d.userLabel?.trim() || d.filename} · {d.slideCount} slides
          </Badge>
        ))}
      </div>

      {fullReport.summary.realignmentWarnings.length > 0 && (
        <Card className="mb-6 border-(--color-warn) p-4">
          <p className="mb-1 text-sm font-semibold text-(--color-warn)">Alignment warnings</p>
          <ul className="list-inside list-disc text-sm text-(--color-ink-2)">
            {fullReport.summary.realignmentWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Card>
      )}

      {fullReport.decks.some((d) => d.warnings.length > 0) && (
        <Card className="mb-6 border-(--color-line-2) p-4">
          <p className="mb-1 text-sm font-semibold text-(--color-ink-2)">Parse warnings</p>
          <ul className="list-inside list-disc text-sm text-(--color-muted)">
            {fullReport.decks.flatMap((d) => d.warnings.map((w, i) => <li key={`${d.deckId}-${i}`}>{d.userLabel || d.filename}: {w}</li>))}
          </ul>
        </Card>
      )}

      <div className="print:hidden">
        <ReportSummary report={fullReport} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search slide text or issues…"
          className="max-w-xs py-2 text-sm"
        />
        <div className="flex items-center gap-1.5 text-sm">
          <Button variant="outline" className="px-3 py-1.5" onClick={() => jumpToIssue(-1)} disabled={issueRows.length === 0}>
            ↑ Prev issue
          </Button>
          <Button variant="outline" className="px-3 py-1.5" onClick={() => jumpToIssue(1)} disabled={issueRows.length === 0}>
            ↓ Next issue
          </Button>
          {issueRows.length > 0 && (
            <span className="text-(--color-muted)">
              {issueCursor + 1} / {issueRows.length} issues
            </span>
          )}
        </div>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setActiveFilter("all");
              setSearch("");
            }}
            className="text-sm font-semibold text-(--color-muted) hover:text-(--color-red)"
          >
            ✕ Clear filter
          </button>
        )}
        <span className="ml-auto text-sm text-(--color-faint)">
          Showing {visibleRows.length} of {fullReport.rows.length} slides
        </span>
      </div>

      <div className="print:hidden">
        <SlideNavigator rows={visibleRows} onJump={setScrollTarget} />
      </div>

      {visibleRows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-(--color-muted)">
          No slides match this filter.{" "}
          <button
            type="button"
            onClick={() => {
              setActiveFilter("all");
              setSearch("");
            }}
            className="font-semibold text-(--color-red)"
          >
            Clear filter
          </button>
        </Card>
      ) : (
        <Card className="overflow-x-auto print:overflow-visible print:border-none print:shadow-none">
          <table className="w-full min-w-max border-collapse text-sm print:min-w-0 print:text-xs">
            <thead>
              <tr className="sticky top-0 z-10 border-b-2 border-(--color-line) bg-(--color-paper-2) text-left print:static">
                <th className="px-4 py-3 font-display text-(--color-ink)">Slide</th>
                <th className="px-4 py-3 font-display text-(--color-ink)">Match</th>
                {fullReport.decks.map((d) => (
                  <th key={d.deckId} className="px-4 py-3 font-display text-(--color-ink)">
                    {d.userLabel?.trim() || d.filename}
                  </th>
                ))}
                <th className="px-4 py-3 font-display text-(--color-ink)">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  id={`row-${row.slideIndex}`}
                  key={row.slideIndex}
                  className={`scroll-mt-16 border-b border-(--color-line) break-inside-avoid border-l-4 transition-shadow ${rowBorderTone[row.overallStatus]} ${row.realignment ? "bg-(--color-warn)/5" : ""}`}
                >
                  <td className="px-4 py-3 align-top font-mono text-(--color-ink-2)">{row.label}</td>
                  <td className="px-4 py-3 align-top">
                    {row.cells.filter((c) => c.slideIndex !== null).length < 2 ? (
                      <span className="text-(--color-faint)">—</span>
                    ) : (
                      <span
                        className={`font-mono text-base font-bold tabular-nums ${matchCellTone(row.overallStatus)}`}
                        title={`${Math.round(row.textMatch.minSimilarity * 100)}% text similarity across decks (threshold: ${Math.round(fullReport.settings.fuzzyThreshold * 100)}%)${row.overallStatus !== "match" ? " — row has other issues, see Status column" : ""}`}
                      >
                        {Math.round(row.textMatch.minSimilarity * 100)}%
                      </span>
                    )}
                  </td>
                  {row.cells.map((cell) => (
                    <td key={cell.deckId} className="max-w-64 px-4 py-3 align-top print:max-w-none">
                      {cell.slideIndex === null ? (
                        <span className="text-(--color-faint)">— no slide —</span>
                      ) : (
                        <div>
                          <p className="truncate text-(--color-ink) print:whitespace-normal" title={cell.textContent}>
                            {cell.textContent || <span className="text-(--color-faint)">(no text)</span>}
                          </p>
                          <p className={`mt-1 text-xs ${cell.builds.length > 0 ? "text-(--color-ink-2)" : "text-(--color-faint)"}`}>
                            {cell.builds.length > 0 ? "▸ " : ""}
                            {buildSummaryLine(cell.builds, cell.buildClickCount)}
                          </p>
                          {cell.hasAutoAdvance && (
                            <p
                              className={`mt-1 text-xs ${row.transitionFlag.status === "mismatch" ? "text-(--color-warn)" : "text-(--color-faint)"}`}
                            >
                              {row.transitionFlag.status === "mismatch" ? "⚠ " : ""}auto-advance {cell.autoAdvanceMs}ms
                            </p>
                          )}
                          {cell.hasAutoplayMedia && (
                            <p
                              className={`mt-1 text-xs ${row.mediaFlag.status === "mismatch" ? "text-(--color-warn)" : "text-(--color-faint)"}`}
                            >
                              {row.mediaFlag.status === "mismatch" ? "⚠ " : ""}autoplay media
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={row.overallStatus} />
                      {row.realignment && (
                        <p className="text-xs font-semibold text-(--color-warn)">⚠ {row.realignment.note}</p>
                      )}
                      {row.issues.length > 0 && (
                        <ul className="text-xs text-(--color-muted)">
                          {row.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
