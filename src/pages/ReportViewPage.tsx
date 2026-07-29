import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { db } from "@/lib/db";
import { reportToCsv, downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/StatusBadge";

export function ReportViewPage() {
  const { showId, reportId } = useParams<{ showId: string; reportId: string }>();
  const report = useLiveQuery(() => db.reports.get(reportId!), [reportId]);

  if (report === undefined) return null;
  if (report === null) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-(--color-muted)">Report not found.</p>
      </div>
    );
  }

  const { fullReport } = report;

  function handleExport() {
    const csv = reportToCsv(report!.fullReport);
    const safeName = (report!.runLabel || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCsv(`deckcheck-${safeName}.csv`, csv);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 print:max-w-full print:p-0">
      <Link
        to={`/shows/${showId}`}
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
        {fullReport.summary.issueCount > 0 ? (
          <Badge tone="danger">{fullReport.summary.issueCount} issue{fullReport.summary.issueCount === 1 ? "" : "s"} flagged</Badge>
        ) : (
          <Badge tone="ok">No issues found</Badge>
        )}
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

      <Card className="overflow-x-auto print:overflow-visible print:border-none print:shadow-none">
        <table className="w-full min-w-max border-collapse text-sm print:min-w-0 print:text-xs">
          <thead>
            <tr className="border-b-2 border-(--color-line) bg-(--color-paper-2) text-left">
              <th className="px-4 py-3 font-display text-(--color-ink)">Slide</th>
              {fullReport.decks.map((d) => (
                <th key={d.deckId} className="px-4 py-3 font-display text-(--color-ink)">
                  {d.userLabel?.trim() || d.filename}
                </th>
              ))}
              <th className="px-4 py-3 font-display text-(--color-ink)">Status</th>
            </tr>
          </thead>
          <tbody>
            {fullReport.rows.map((row) => (
              <tr
                key={row.slideIndex}
                className={`border-b border-(--color-line) break-inside-avoid ${row.realignment ? "border-l-4 border-l-(--color-warn) bg-(--color-warn)/5" : ""}`}
              >
                <td className="px-4 py-3 align-top font-mono text-(--color-ink-2)">{row.slideIndex}</td>
                {row.cells.map((cell) => (
                  <td key={cell.deckId} className="max-w-64 px-4 py-3 align-top print:max-w-none">
                    {cell.slideIndex === null ? (
                      <span className="text-(--color-faint)">— no slide —</span>
                    ) : (
                      <div>
                        <p className="truncate text-(--color-ink) print:whitespace-normal" title={cell.textContent}>
                          {cell.textContent || <span className="text-(--color-faint)">(no text)</span>}
                        </p>
                        <p className="mt-1 text-xs text-(--color-muted)">
                          {cell.buildClickCount} click{cell.buildClickCount === 1 ? "" : "s"}
                        </p>
                        {cell.hasAutoAdvance && (
                          <p className="mt-1 text-xs text-(--color-warn)">⚠ auto-advance {cell.autoAdvanceMs}ms</p>
                        )}
                        {cell.hasAutoplayMedia && <p className="mt-1 text-xs text-(--color-warn)">⚠ autoplay media</p>}
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
    </div>
  );
}
