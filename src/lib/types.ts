// Organizational entities — persisted to IndexedDB.

export interface Show {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  notes: string | null;
}

export interface Report {
  id: string;
  showId: string;
  runLabel: string | null;
  createdAt: number;
  deckLabels: string[];
  summary: {
    totalSlides: number;
    issueCount: number;
  };
  fullReport: ComparisonReport;
}

// Per-slide fingerprint — the parsing output that feeds a Report.
// Lives in memory only during a run; never persisted raw, only via ComparisonReport.

export interface SlideFingerprint {
  slideIndex: number;
  slideId: string;
  textContent: string;
  textHash: string;

  transition: {
    hasTransition: boolean;
    autoAdvanceMs: number | null;
    clickAdvance: boolean;
  };

  builds: BuildStep[];
  buildClickCount: number;

  media: MediaNode[];
}

export interface BuildStep {
  stepIndex: number;
  trigger: "onClick" | "withPrevious" | "afterPrevious";
  delayMs: number | null;
  targetShapeIds: string[];
  effectType: string | null;
}

export interface MediaNode {
  shapeId: string;
  type: "video" | "audio";
  autoplay: boolean;
  durationMs: number | null;
  trigger: "onClick" | "withPrevious" | "afterPrevious";
}

export interface DeckFingerprint {
  deckId: string;
  filename: string;
  userLabel: string | null;
  slideCount: number;
  slides: SlideFingerprint[];
  warnings: string[];
}

// Diff / report structures (§7 / §8)

// "structural" covers slide-count differences (a slide missing on one side, or an extra slide
// with no counterpart at all) — kept distinct from "mismatch" so a deck simply running long/short
// doesn't read as alarmingly as genuinely divergent content on a shared slide.
export type MatchStatus = "match" | "partial" | "structural" | "mismatch" | "info";

export interface SlideCellResult {
  deckId: string;
  slideIndex: number | null; // null if this deck has no aligned slide here
  textContent: string;
  buildClickCount: number;
  builds: BuildStep[]; // full step list — used for the informational effect-type comparison
  hasAutoAdvance: boolean;
  autoAdvanceMs: number | null;
  hasAutoplayMedia: boolean;
}

export interface SlideDiffRow {
  slideIndex: number;
  /** Human-facing row label — the plain slide number for a normal row, or a description like
   * "Extra in Deck B (after slide 12)" for a row that only exists because one deck has a slide
   * with no counterpart anywhere else. Always prefer this over `slideIndex` for display. */
  label: string;
  cells: SlideCellResult[];
  textMatch: { status: MatchStatus; minSimilarity: number };
  buildMatch: { status: MatchStatus };
  transitionFlag: { status: MatchStatus; present: boolean };
  mediaFlag: { status: MatchStatus; present: boolean; consistent: boolean };
  overallStatus: MatchStatus;
  issues: string[]; // human-readable flags, e.g. "deck2.pptx: build mismatch (4 vs 3 clicks)"
  realignment?: { deckId: string; note: string };
}

// "soft" (default): presence alone is an informational ⚠️ flag; only inconsistency across the
// group escalates to a ❌ mismatch. "hard": presence alone is always a ❌ mismatch, since
// auto-advancing/autoplaying content is inherently risky on synced show content regardless of
// whether every deck agrees (spec §12 open decision — configurable per-show).
export type FlagSeverity = "soft" | "hard";

export interface ReportSettings {
  fuzzyThreshold: number;
  autoAdvanceSeverity: FlagSeverity;
  autoplaySeverity: FlagSeverity;
}

export const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  fuzzyThreshold: 0.85,
  autoAdvanceSeverity: "soft",
  autoplaySeverity: "soft",
};

export interface ComparisonReport {
  decks: Array<{ deckId: string; filename: string; userLabel: string | null; slideCount: number; warnings: string[] }>;
  rows: SlideDiffRow[];
  settings: ReportSettings;
  summary: {
    decksCompared: number;
    totalAlignedSlides: number;
    issueCount: number;
    realignmentWarnings: string[];
  };
}

// Worker protocol

export type WorkerRequest = {
  type: "parse";
  jobId: string;
  files: Array<{ deckId: string; filename: string; userLabel: string | null; buffer: ArrayBuffer }>;
  settings: ReportSettings;
};

export type WorkerResponse =
  | { type: "progress"; jobId: string; deckId: string; slidesParsed: number; totalSlides: number }
  | { type: "deckParsed"; jobId: string; deck: DeckFingerprint }
  | { type: "done"; jobId: string; report: ComparisonReport }
  | { type: "error"; jobId: string; message: string };
