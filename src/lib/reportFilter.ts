import type { SlideDiffRow } from "./types";

/** Named row filters surfaced as clickable dashboard tiles / chips on the report view.
 * "issues" / "info" / "clean" split on overallStatus; "text" / "structural" / "build" / "flags"
 * drill into one specific check regardless of what else is going on in that row. */
export type ReportFilter = "all" | "issues" | "info" | "clean" | "text" | "structural" | "build" | "flags";

export function rowMatchesFilter(row: SlideDiffRow, filter: ReportFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "issues":
      return row.overallStatus === "mismatch" || row.overallStatus === "partial" || row.overallStatus === "structural";
    case "info":
      return row.overallStatus === "info";
    case "clean":
      return row.overallStatus === "match";
    case "text":
      return row.textMatch.status === "mismatch" || row.textMatch.status === "partial";
    case "structural":
      return row.textMatch.status === "structural";
    case "build":
      return row.buildMatch.status === "mismatch";
    case "flags":
      return row.transitionFlag.present || row.mediaFlag.present;
  }
}

export function rowMatchesSearch(row: SlideDiffRow, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  if (row.label.toLowerCase().includes(q)) return true;
  if (row.issues.some((issue) => issue.toLowerCase().includes(q))) return true;
  return row.cells.some((cell) => cell.textContent.toLowerCase().includes(q));
}
