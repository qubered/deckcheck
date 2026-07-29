import { distance } from "fastest-levenshtein";
import type {
  ComparisonReport,
  DeckFingerprint,
  MatchStatus,
  SlideCellResult,
  SlideDiffRow,
} from "./types";

export const DEFAULT_FUZZY_THRESHOLD = 0.85;

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a, b) / maxLen;
}

function cellForSlide(deck: DeckFingerprint, slideIndex: number): SlideCellResult {
  const slide = deck.slides[slideIndex - 1];
  if (!slide) {
    return {
      deckId: deck.deckId,
      slideIndex: null,
      textContent: "",
      buildClickCount: 0,
      hasAutoAdvance: false,
      autoAdvanceMs: null,
      hasAutoplayMedia: false,
    };
  }
  return {
    deckId: deck.deckId,
    slideIndex: slide.slideIndex,
    textContent: slide.textContent,
    buildClickCount: slide.buildClickCount,
    hasAutoAdvance: slide.transition.autoAdvanceMs !== null,
    autoAdvanceMs: slide.transition.autoAdvanceMs,
    hasAutoplayMedia: slide.media.some((m) => m.autoplay),
  };
}

function labelFor(deck: DeckFingerprint): string {
  return deck.userLabel?.trim() || deck.filename;
}

/**
 * Builds a per-slide diff report across 2+ parsed decks.
 *
 * v1 scope: positional alignment only (slide index N assumed to correspond
 * across all decks) + text fuzzy-match and transition auto-advance flagging.
 * Fuzzy realignment for mismatched slide counts is Phase 3.
 */
export function buildComparisonReport(
  decks: DeckFingerprint[],
  fuzzyThreshold: number = DEFAULT_FUZZY_THRESHOLD,
): ComparisonReport {
  const maxSlideCount = Math.max(...decks.map((d) => d.slideCount), 0);
  const rows: SlideDiffRow[] = [];
  let issueCount = 0;

  const realignmentWarnings: string[] = [];
  const majorityCount = mode(decks.map((d) => d.slideCount));
  for (const deck of decks) {
    if (deck.slideCount !== majorityCount) {
      realignmentWarnings.push(
        `${labelFor(deck)} has ${deck.slideCount} slides vs. ${majorityCount} in the rest of the group — positions after the shorter/longer deck may be misaligned (fuzzy realignment isn't implemented yet).`,
      );
    }
  }

  for (let slideIndex = 1; slideIndex <= maxSlideCount; slideIndex++) {
    const cells = decks.map((deck) => cellForSlide(deck, slideIndex));
    const issues: string[] = [];

    const presentCells = cells.filter((c) => c.slideIndex !== null);
    const missingCells = cells.filter((c) => c.slideIndex === null);

    let textStatus: MatchStatus = "match";
    let minSimilarity = 1;

    if (missingCells.length > 0) {
      textStatus = "mismatch";
      for (const missing of missingCells) {
        const deck = decks.find((d) => d.deckId === missing.deckId)!;
        issues.push(`${labelFor(deck)}: no slide here (deck ends at slide ${deck.slideCount})`);
      }
    }

    if (presentCells.length >= 2) {
      for (let i = 0; i < presentCells.length; i++) {
        for (let j = i + 1; j < presentCells.length; j++) {
          const sim = similarity(presentCells[i].textContent, presentCells[j].textContent);
          minSimilarity = Math.min(minSimilarity, sim);
        }
      }
      if (missingCells.length === 0) {
        if (minSimilarity >= fuzzyThreshold) {
          textStatus = "match";
        } else if (minSimilarity >= fuzzyThreshold - 0.15) {
          textStatus = "partial";
          issues.push(`Text content ${Math.round(minSimilarity * 100)}% similar across decks (below ${Math.round(fuzzyThreshold * 100)}% threshold)`);
        } else {
          textStatus = "mismatch";
          issues.push(`Text content mismatch — only ${Math.round(minSimilarity * 100)}% similar across decks`);
        }
      }
    }

    // Transition auto-advance: flagged whenever present on any deck, independent of consistency —
    // auto-advance is inherently risky on synced content regardless of whether every deck agrees.
    const autoAdvanceCells = presentCells.filter((c) => c.hasAutoAdvance);
    const transitionPresent = autoAdvanceCells.length > 0;
    if (transitionPresent) {
      for (const c of autoAdvanceCells) {
        const deck = decks.find((d) => d.deckId === c.deckId)!;
        issues.push(`${labelFor(deck)}: auto-advances after ${c.autoAdvanceMs}ms`);
      }
    }

    // Build/click count: primary comparable unit for animation-heavy decks — every deck in the
    // group should agree on how many clicks a slide takes to fully play out.
    let buildStatus: MatchStatus = "match";
    if (presentCells.length >= 2) {
      const distinctCounts = new Set(presentCells.map((c) => c.buildClickCount));
      if (distinctCounts.size > 1) {
        buildStatus = "mismatch";
        issues.push(
          `Build/click count mismatch — ${presentCells
            .map((c) => `${labelFor(decks.find((d) => d.deckId === c.deckId)!)}: ${c.buildClickCount} click${c.buildClickCount === 1 ? "" : "s"}`)
            .join(", ")}`,
        );
      }
    }

    // Media autoplay: flagged whenever present (inherently risky on synced content), escalated to
    // a hard mismatch if only some decks in the group have it.
    const autoplayCells = presentCells.filter((c) => c.hasAutoplayMedia);
    const mediaPresent = autoplayCells.length > 0;
    const mediaConsistent = !mediaPresent || autoplayCells.length === presentCells.length;
    const mediaStatus: MatchStatus = mediaPresent && !mediaConsistent ? "mismatch" : mediaPresent ? "info" : "match";
    if (mediaPresent) {
      issues.push(
        `Autoplay media on: ${autoplayCells.map((c) => labelFor(decks.find((d) => d.deckId === c.deckId)!)).join(", ")}${
          mediaConsistent ? "" : " (not present on the rest of the group)"
        }`,
      );
    }

    let overallStatus: MatchStatus;
    if (textStatus === "mismatch" || buildStatus === "mismatch" || mediaStatus === "mismatch") overallStatus = "mismatch";
    else if (textStatus === "partial") overallStatus = "partial";
    else if (transitionPresent || mediaStatus === "info") overallStatus = "info";
    else overallStatus = "match";

    if (overallStatus === "mismatch" || overallStatus === "partial") issueCount++;

    rows.push({
      slideIndex,
      cells,
      textMatch: { status: textStatus, minSimilarity },
      buildMatch: { status: buildStatus },
      transitionFlag: { status: transitionPresent ? "info" : "match", present: transitionPresent },
      mediaFlag: { status: mediaStatus, present: mediaPresent, consistent: mediaConsistent },
      overallStatus,
      issues,
    });
  }

  return {
    decks: decks.map((d) => ({
      deckId: d.deckId,
      filename: d.filename,
      userLabel: d.userLabel,
      slideCount: d.slideCount,
      warnings: d.warnings,
    })),
    rows,
    fuzzyThreshold,
    summary: {
      decksCompared: decks.length,
      totalAlignedSlides: maxSlideCount,
      issueCount,
      realignmentWarnings,
    },
  };
}

function mode(nums: number[]): number {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  let best = nums[0];
  let bestCount = 0;
  for (const [n, c] of counts) {
    if (c > bestCount) {
      best = n;
      bestCount = c;
    }
  }
  return best;
}
