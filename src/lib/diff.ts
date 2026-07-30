import { distance } from "fastest-levenshtein";
import { alignDeckToReference } from "./alignment";
import { effectFamilyLabel } from "./effectLabels";
import { DEFAULT_REPORT_SETTINGS } from "./types";
import type {
  ComparisonReport,
  DeckFingerprint,
  MatchStatus,
  ReportSettings,
  SlideCellResult,
  SlideDiffRow,
} from "./types";

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a, b) / maxLen;
}

// `actualIndex` is already resolved to this deck's own 1-based slide position — either directly
// (decks that match the group's majority slide count, or the reference deck itself) or via a
// fuzzy realignment mapping (§6 Phase 3) for an outlier deck. `null` means no counterpart slide
// was found for this row, whichever way it was resolved.
function cellFor(deck: DeckFingerprint, actualIndex: number | null): SlideCellResult {
  const slide = actualIndex !== null ? deck.slides[actualIndex - 1] : undefined;
  if (!slide) {
    return {
      deckId: deck.deckId,
      slideIndex: null,
      textContent: "",
      buildClickCount: 0,
      builds: [],
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
    builds: slide.builds,
    hasAutoAdvance: slide.transition.autoAdvanceMs !== null,
    autoAdvanceMs: slide.transition.autoAdvanceMs,
    hasAutoplayMedia: slide.media.some((m) => m.autoplay),
  };
}

// Build target/effect comparison (spec §7): informational only in v1 — never affects
// overallStatus/issueCount, just surfaced as an advisory note per step index.
function compareEffects(presentCells: SlideCellResult[], decks: DeckFingerprint[]): string[] {
  const notes: string[] = [];
  const maxStep = presentCells.reduce(
    (max, c) => Math.max(max, ...c.builds.map((b) => b.stepIndex), 0),
    0,
  );
  for (let step = 1; step <= maxStep; step++) {
    const atStep = presentCells
      .map((c) => ({ deckId: c.deckId, build: c.builds.find((b) => b.stepIndex === step) }))
      .filter((x): x is { deckId: string; build: NonNullable<(typeof x)["build"]> } => x.build !== undefined);
    if (atStep.length < 2) continue;
    const distinctEffects = new Set(atStep.map((x) => x.build.effectType ?? "(none)"));
    if (distinctEffects.size > 1) {
      notes.push(
        `ℹ Step ${step} effect type differs — ${atStep
          .map((x) => `${labelFor(decks.find((d) => d.deckId === x.deckId)!)}: ${effectFamilyLabel(x.build.effectType)}`)
          .join(", ")}`,
      );
    }
  }
  return notes;
}

function labelFor(deck: DeckFingerprint): string {
  return deck.userLabel?.trim() || deck.filename;
}

/**
 * Builds a per-slide diff report across 2+ parsed decks.
 *
 * Alignment: positional by default (slide index N assumed to correspond across all decks). A
 * deck whose slide count doesn't match the group's majority gets a pairwise fuzzy-text
 * realignment against a reference deck instead (§6 Phase 3) — flagged explicitly via
 * `summary.realignmentWarnings` and per-row `realignment` notes, never silently trusted.
 */
export function buildComparisonReport(
  decks: DeckFingerprint[],
  settings: ReportSettings = DEFAULT_REPORT_SETTINGS,
): ComparisonReport {
  const { fuzzyThreshold, autoAdvanceSeverity, autoplaySeverity } = settings;
  const rows: SlideDiffRow[] = [];
  let issueCount = 0;

  const realignmentWarnings: string[] = [];
  const majorityCount = mode(decks.map((d) => d.slideCount));
  // The reference deck defines the show's canonical slide count/order — the first deck matching
  // the majority count, or just the first deck if every deck disagrees. No fixed reference deck
  // is required otherwise (comparison stays group-wise per slide index).
  const referenceDeck = decks.find((d) => d.slideCount === majorityCount) ?? decks[0];
  const maxSlideCount = referenceDeck.slideCount;

  const alignments = new Map<string, ReturnType<typeof alignDeckToReference>>();
  for (const deck of decks) {
    if (deck.deckId === referenceDeck.deckId || deck.slideCount === majorityCount) continue;
    const alignment = alignDeckToReference(referenceDeck, deck);
    alignments.set(deck.deckId, alignment);
    const fromSlide = alignment.misalignedFromSlide;
    const extraCount = Array.from(alignment.extraOwnSlidesByAnchor.values()).reduce((n, list) => n + list.length, 0);
    realignmentWarnings.push(
      `${labelFor(deck)} has ${deck.slideCount} slides vs. ${referenceDeck.slideCount} in ${labelFor(referenceDeck)} — ` +
        (fromSlide !== null
          ? `fuzzy-realigned by text content; first diverges around slide ${fromSlide}. Double-check that region.`
          : `fuzzy-realigned by text content; the extra/missing slide(s) fell at the very start or end, so the rest lines up 1:1. Double-check the ends of the deck.`) +
        (extraCount > 0
          ? ` ${extraCount} slide${extraCount === 1 ? "" : "s"} with no counterpart at all ${extraCount === 1 ? "is" : "are"} shown below as its own row.`
          : ""),
    );
  }

  function actualIndexFor(deck: DeckFingerprint, slideIndex: number): number | null {
    if (deck.deckId === referenceDeck.deckId || deck.slideCount === majorityCount) return slideIndex;
    return alignments.get(deck.deckId)?.referenceToOwnIndex.get(slideIndex) ?? null;
  }

  // Report rows are built from a column plan rather than a flat 1..maxSlideCount loop, so that an
  // outlier deck's slides with no reference counterpart at all (e.g. the 2 extra slides in a
  // 23-slide deck vs. a 21-slide reference) still get their own row instead of being silently
  // dropped from the report.
  type Column =
    | { kind: "reference"; refIndex: number }
    | { kind: "extra"; anchorRefIndex: number; deckId: string; ownIndex: number; seq: number };

  const columns: Column[] = [];
  let extraSeq = 0;
  for (let anchor = 0; anchor <= maxSlideCount; anchor++) {
    for (const [deckId, alignment] of alignments) {
      const extras = alignment.extraOwnSlidesByAnchor.get(anchor) ?? [];
      for (const ownIndex of extras) {
        columns.push({ kind: "extra", anchorRefIndex: anchor, deckId, ownIndex, seq: extraSeq++ });
      }
    }
    if (anchor < maxSlideCount) {
      columns.push({ kind: "reference", refIndex: anchor + 1 });
    }
  }

  for (const column of columns) {
    const cells = decks.map((deck) =>
      cellFor(
        deck,
        column.kind === "extra"
          ? deck.deckId === column.deckId
            ? column.ownIndex
            : null
          : actualIndexFor(deck, column.refIndex),
      ),
    );
    const issues: string[] = [];

    let realignment: SlideDiffRow["realignment"];
    if (column.kind === "extra") {
      const deck = decks.find((d) => d.deckId === column.deckId)!;
      realignment = {
        deckId: column.deckId,
        note: `Extra slide in ${labelFor(deck)} with no counterpart in ${labelFor(referenceDeck)} — verify whether it belongs here.`,
      };
    } else {
      for (const [deckId, alignment] of alignments) {
        if (alignment.misalignedFromSlide !== null && column.refIndex >= alignment.misalignedFromSlide) {
          const deck = decks.find((d) => d.deckId === deckId)!;
          realignment = {
            deckId,
            note: `${labelFor(deck)}'s slide count doesn't match the rest of the group, so from here on its slides are matched by text content instead of position — double-check this row lines up with the right slide.`,
          };
          break;
        }
      }
    }

    const presentCells = cells.filter((c) => c.slideIndex !== null);
    const missingCells = cells.filter((c) => c.slideIndex === null);

    let textStatus: MatchStatus = "match";
    let minSimilarity = 1;

    if (column.kind === "extra") {
      textStatus = "structural";
      const deck = decks.find((d) => d.deckId === column.deckId)!;
      const others = decks.filter((d) => d.deckId !== column.deckId).map((d) => labelFor(d));
      issues.push(`${labelFor(deck)} has a slide here with no counterpart in ${others.join(", ") || "the other deck(s)"}.`);
    } else if (missingCells.length > 0) {
      textStatus = "structural";
      for (const missing of missingCells) {
        const deck = decks.find((d) => d.deckId === missing.deckId)!;
        const isRealigned = alignments.has(deck.deckId);
        issues.push(
          isRealigned
            ? `${labelFor(deck)}: no corresponding slide found here after realignment`
            : `${labelFor(deck)}: no slide here (deck ends at slide ${deck.slideCount})`,
        );
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
    // Severity is configurable per-show (spec §12): "soft" keeps it informational, "hard" escalates
    // bare presence to a mismatch.
    const autoAdvanceCells = presentCells.filter((c) => c.hasAutoAdvance);
    const transitionPresent = autoAdvanceCells.length > 0;
    const transitionStatus: MatchStatus = transitionPresent
      ? autoAdvanceSeverity === "hard"
        ? "mismatch"
        : "info"
      : "match";
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
      } else {
        // Click counts agree, so step indices line up meaningfully across decks — worth checking
        // whether the same step plays a different effect (fade vs. wipe, etc.) on each deck.
        issues.push(...compareEffects(presentCells, decks));
      }
    }

    // Media autoplay: flagged whenever present (inherently risky on synced content), always
    // escalated to a mismatch if only some decks in the group have it (that's a real
    // inconsistency, not a severity choice), and additionally escalated on bare presence when
    // this show's autoplay severity is set to "hard".
    const autoplayCells = presentCells.filter((c) => c.hasAutoplayMedia);
    const mediaPresent = autoplayCells.length > 0;
    const mediaConsistent = !mediaPresent || autoplayCells.length === presentCells.length;
    const mediaStatus: MatchStatus =
      mediaPresent && (!mediaConsistent || autoplaySeverity === "hard") ? "mismatch" : mediaPresent ? "info" : "match";
    if (mediaPresent) {
      issues.push(
        `Autoplay media on: ${autoplayCells.map((c) => labelFor(decks.find((d) => d.deckId === c.deckId)!)).join(", ")}${
          mediaConsistent ? "" : " (not present on the rest of the group)"
        }`,
      );
    }

    let overallStatus: MatchStatus;
    if (textStatus === "mismatch" || buildStatus === "mismatch" || mediaStatus === "mismatch" || transitionStatus === "mismatch") {
      overallStatus = "mismatch";
    } else if (textStatus === "structural") {
      overallStatus = "structural";
    } else if (textStatus === "partial") {
      overallStatus = "partial";
    } else if (transitionStatus === "info" || mediaStatus === "info") {
      overallStatus = "info";
    } else {
      overallStatus = "match";
    }

    if (overallStatus === "mismatch" || overallStatus === "partial" || overallStatus === "structural") issueCount++;

    const label =
      column.kind === "extra"
        ? `Extra in ${labelFor(decks.find((d) => d.deckId === column.deckId)!)} (${
            column.anchorRefIndex === 0 ? "before slide 1" : `after slide ${column.anchorRefIndex}`
          })`
        : String(column.refIndex);

    rows.push({
      slideIndex: column.kind === "extra" ? column.anchorRefIndex + 0.001 * (column.seq + 1) : column.refIndex,
      label,
      cells,
      textMatch: { status: textStatus, minSimilarity },
      buildMatch: { status: buildStatus },
      transitionFlag: { status: transitionStatus, present: transitionPresent },
      mediaFlag: { status: mediaStatus, present: mediaPresent, consistent: mediaConsistent },
      overallStatus,
      issues,
      ...(realignment ? { realignment } : {}),
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
    settings,
    summary: {
      decksCompared: decks.length,
      totalAlignedSlides: rows.length,
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
