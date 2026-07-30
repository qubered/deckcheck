import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate, useParams } from "react-router-dom";
import { db, deleteReport } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { IssueTrend } from "@/components/IssueTrend";

export function ShowDetailPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const show = useLiveQuery(() => db.shows.get(showId!), [showId]);
  const reports = useLiveQuery(
    () => db.reports.where("showId").equals(showId!).reverse().sortBy("createdAt"),
    [showId],
  );

  if (show === undefined) return null;
  if (show === null || show === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <EmptyState title="Show not found" action={<Link to="/app"><Button variant="outline">Back to Shows</Button></Link>} />
      </div>
    );
  }

  async function handleDeleteReport(reportId: string) {
    if (!confirm("Delete this report? This can't be undone.")) return;
    await deleteReport(reportId);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link to="/app" className="mb-4 inline-block text-sm text-(--color-muted) hover:text-(--color-red)">
        ← All Shows
      </Link>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-(--color-ink)">{show.name}</h1>
          {show.notes && <p className="mt-1 text-(--color-muted)">{show.notes}</p>}
        </div>
        <Button onClick={() => navigate(`/app/shows/${show.id}/run`)}>+ Run new report</Button>
      </header>

      {reports && reports.length === 0 && (
        <EmptyState
          title="No reports yet"
          description="Run a comparison across this show's decks to generate the first report."
          action={<Button onClick={() => navigate(`/app/shows/${show.id}/run`)}>+ Run new report</Button>}
        />
      )}

      {reports && reports.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Reports run" value={reports.length} />
          <StatTile
            label="Latest run"
            value={reports[0].summary.issueCount}
            tone={reports[0].summary.issueCount > 0 ? "danger" : "ok"}
            sublabel={reports[0].summary.issueCount > 0 ? "issues flagged" : "clean"}
          />
          <StatTile label="Decks in latest run" value={reports[0].deckLabels.length} />
          <StatTile
            label="Slides compared"
            value={reports[0].summary.totalSlides}
            sublabel={new Date(reports[0].createdAt).toLocaleDateString()}
          />
        </div>
      )}

      {reports && reports.length >= 2 && <IssueTrend reports={reports} />}

      <div className="flex flex-col gap-3">
        {reports?.map((report, i) => {
          // reports is newest-first; the previous *run* (chronologically) is the next entry.
          const previous = reports[i + 1];
          const delta = previous ? report.summary.issueCount - previous.summary.issueCount : null;

          return (
            <Card
              key={report.id}
              className="flex cursor-pointer items-center justify-between px-5 py-4 hover:border-(--color-red)"
              onClick={() => navigate(`/app/shows/${show.id}/reports/${report.id}`)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-(--color-module-report)" />
                  <h2 className="font-display font-bold text-(--color-ink)">
                    {report.runLabel || new Date(report.createdAt).toLocaleString()}
                  </h2>
                </div>
                <p className="mt-1 text-sm text-(--color-muted)">
                  {report.deckLabels.join(", ")} · {report.summary.totalSlides} slides
                  {delta !== null && (
                    <span className={delta < 0 ? "text-(--color-ok)" : delta > 0 ? "text-(--color-timeout)" : "text-(--color-muted)"}>
                      {" "}
                      · {delta < 0 ? `▼ ${-delta} fewer` : delta > 0 ? `▲ ${delta} more` : "= same"} than previous run
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {report.summary.issueCount > 0 ? (
                  <Badge tone="danger">{report.summary.issueCount} issue{report.summary.issueCount === 1 ? "" : "s"}</Badge>
                ) : (
                  <Badge tone="ok">Clean</Badge>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReport(report.id);
                  }}
                  className="text-(--color-faint) hover:text-(--color-timeout)"
                  aria-label="Delete report"
                >
                  Delete
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
