import type { Report } from "@/lib/types";
import { Card } from "@/components/ui/Card";

/** Simple issue-count-over-time view for a Show's report history — "did this get better between
 * checks?" (spec §10 Phase 4, nice-to-have once history exists). `reports` is newest-first, as
 * queried by the page; this renders oldest-to-newest, matching how a trend reads left-to-right. */
export function IssueTrend({ reports }: { reports: Report[] }) {
  const chronological = [...reports].reverse();
  const maxIssues = Math.max(1, ...chronological.map((r) => r.summary.issueCount));

  return (
    <Card className="mb-6 p-4">
      <p className="mb-3 text-sm font-semibold text-(--color-ink-2)">Issue count trend</p>
      <div className="flex items-end gap-2" style={{ height: 64 }}>
        {chronological.map((r) => (
          <div key={r.id} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-mono text-(--color-muted)">{r.summary.issueCount}</span>
            <div
              className={`w-full rounded-t-(--radius-md) ${r.summary.issueCount > 0 ? "bg-(--color-timeout)" : "bg-(--color-ok)"}`}
              style={{ height: Math.max(4, (r.summary.issueCount / maxIssues) * 40) }}
              title={`${r.runLabel || new Date(r.createdAt).toLocaleString()}: ${r.summary.issueCount} issue${r.summary.issueCount === 1 ? "" : "s"}`}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-(--color-faint)">
        Oldest → newest: {chronological.map((r) => r.summary.issueCount).join(" → ")}
      </p>
    </Card>
  );
}
