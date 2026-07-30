import type { MatchStatus, SlideDiffRow } from "@/lib/types";

const tickColor: Record<MatchStatus, string> = {
  match: "bg-(--color-ok)",
  partial: "bg-(--color-warn)",
  structural: "bg-(--color-warn)",
  mismatch: "bg-(--color-timeout)",
  info: "bg-(--color-module-show)",
};

/** Minimap over the currently visible rows — one tick per row, colored by status, click to jump.
 * Reflects whatever's actually rendered below it (post filter/search), so a tick is always
 * clickable to something on the page rather than pointing at a hidden row. Deliberately no legend
 * of its own — the same status colors are already explained by the badges in the table it sits
 * above, so this stays a quiet "shape of the report" strip rather than another block of chrome. */
export function SlideNavigator({ rows, onJump }: { rows: SlideDiffRow[]; onJump: (slideIndex: number) => void }) {
  if (rows.length < 2) return null;

  return (
    <div
      className="mb-3 flex h-2.5 w-full gap-px overflow-hidden rounded-(--radius-pill)"
      title="Slide overview — click a tick to jump"
    >
      {rows.map((row) => (
        <button
          key={row.slideIndex}
          type="button"
          onClick={() => onJump(row.slideIndex)}
          title={
            row.cells.filter((c) => c.slideIndex !== null).length < 2
              ? `${row.label} — ${row.overallStatus}`
              : `${row.label} — ${row.overallStatus} — ${Math.round(row.textMatch.minSimilarity * 100)}% match`
          }
          aria-label={`Jump to ${row.label}`}
          className={`h-full flex-1 transition-transform hover:scale-y-150 ${tickColor[row.overallStatus]}`}
        />
      ))}
    </div>
  );
}
