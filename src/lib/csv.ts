import type { ComparisonReport } from "./types";

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function deckLabel(deck: ComparisonReport["decks"][number]): string {
  return deck.userLabel?.trim() || deck.filename;
}

export function reportToCsv(report: ComparisonReport): string {
  const header = ["Slide", ...report.decks.map((d) => deckLabel(d)), "Status", "Issues"];
  const lines = [header.map(escapeCsvCell).join(",")];

  for (const row of report.rows) {
    const cells = row.cells.map((c) => {
      if (c.slideIndex === null) return "(no slide)";
      const parts = [c.textContent.slice(0, 60) || "(no text)"];
      if (c.hasAutoAdvance) parts.push(`auto-advance ${c.autoAdvanceMs}ms`);
      return parts.join(" | ");
    });
    const line = [
      String(row.slideIndex),
      ...cells,
      row.overallStatus,
      row.issues.join("; "),
    ];
    lines.push(line.map(escapeCsvCell).join(","));
  }

  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
