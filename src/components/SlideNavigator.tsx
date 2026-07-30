import type { MatchStatus, SlideDiffRow } from "@/lib/types";

const tickColor: Record<MatchStatus, string> = {
  match: "bg-(--color-ok)",
  partial: "bg-(--color-warn)",
  structural: "bg-(--color-warn)",
  mismatch: "bg-(--color-timeout)",
  info: "bg-(--color-module-show)",
};

const legendItems: Array<{ status: MatchStatus; label: string }> = [
  { status: "mismatch", label: "Mismatch" },
  { status: "partial", label: "Partial" },
  { status: "structural", label: "No counterpart" },
  { status: "info", label: "Flagged" },
  { status: "match", label: "Match" },
];

/** Minimap over the currently visible rows — one tick per row, colored by status, click to jump.
 * Reflects whatever's actually rendered below it (post filter/search), so a tick is always
 * clickable to something on the page rather than pointing at a hidden row. */
export function SlideNavigator({ rows, onJump }: { rows: SlideDiffRow[]; onJump: (slideIndex: number) => void }) {
  if (rows.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex h-6 w-full gap-px overflow-hidden rounded-(--radius-md) border border-(--color-line) bg-(--color-paper-2) p-0.5">
        {rows.map((row) => (
          <button
            key={row.slideIndex}
            type="button"
            onClick={() => onJump(row.slideIndex)}
            title={`${row.label} — ${row.overallStatus}`}
            aria-label={`Jump to ${row.label}`}
            className={`h-full flex-1 rounded-[2px] transition-transform hover:scale-y-125 ${tickColor[row.overallStatus]}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--color-muted)">
        {legendItems.map(({ status, label }) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${tickColor[status]}`} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
