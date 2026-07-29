import { distance } from "fastest-levenshtein";
import type { DeckFingerprint } from "./types";

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a, b) / maxLen;
}

const GAP_PENALTY = -0.5;

export interface AlignmentResult {
  /** Maps a reference-deck slide index (1-based) to this deck's own slide index (1-based),
   * or null if no corresponding slide was found for that position. */
  referenceToOwnIndex: Map<number, number | null>;
  /** The lowest reference slide index where this deck's mapped index first stops being a plain
   * 1:1 positional match — i.e. where the divergence actually starts. Null if the deck's slides
   * still line up 1:1 across the whole reference range despite the differing total count (e.g.
   * the extra/missing slides are all at the very end). */
  misalignedFromSlide: number | null;
  /** This deck's own slide indices (1-based) that have no reference counterpart at all, keyed by
   * the reference index they immediately follow (0 = before the reference's first slide). The
   * caller surfaces each of these as its own report row instead of dropping them — a deck with
   * more slides than the reference should still show every one of them. */
  extraOwnSlidesByAnchor: Map<number, number[]>;
}

/**
 * Pairwise fuzzy realignment (spec §6, Phase 3) for a single outlier deck against a reference
 * deck (the slide-count majority within the comparison group). A simplified Needleman-Wunsch
 * global alignment using text similarity as the match score and a flat gap penalty for
 * insertions/deletions — deliberately pairwise against one reference, not full N-way sequence
 * alignment across every deck, per the spec's own scoping ("Skip general N-way sequence
 * alignment... positional-first with a flagged fallback is enough").
 */
export function alignDeckToReference(reference: DeckFingerprint, outlier: DeckFingerprint): AlignmentResult {
  const refTexts = reference.slides.map((s) => s.textContent);
  const outTexts = outlier.slides.map((s) => s.textContent);
  const n = refTexts.length;
  const m = outTexts.length;

  // score[i][j] = best alignment score between reference[0..i) and outlier[0..j)
  const score: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) score[i][0] = i * GAP_PENALTY;
  for (let j = 1; j <= m; j++) score[0][j] = j * GAP_PENALTY;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = score[i - 1][j - 1] + similarity(refTexts[i - 1], outTexts[j - 1]);
      const up = score[i - 1][j] + GAP_PENALTY; // reference slide has no counterpart here
      const left = score[i][j - 1] + GAP_PENALTY; // outlier slide has no counterpart here
      score[i][j] = Math.max(diag, up, left);
    }
  }

  const referenceToOwnIndex = new Map<number, number | null>();
  const extraOwnSlidesByAnchor = new Map<number, number[]>();
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const diag = i > 0 && j > 0 ? score[i - 1][j - 1] + similarity(refTexts[i - 1], outTexts[j - 1]) : -Infinity;
    const up = i > 0 ? score[i - 1][j] + GAP_PENALTY : -Infinity;
    if (i > 0 && j > 0 && score[i][j] === diag) {
      referenceToOwnIndex.set(i, j); // 1-based
      i--;
      j--;
    } else if (i > 0 && score[i][j] === up) {
      referenceToOwnIndex.set(i, null);
      i--;
    } else {
      // Outlier has an extra slide not present in the reference. `i` hasn't moved yet, so in
      // forward order this slide sits immediately after reference index `i` (0 = before the
      // reference's first slide) — record it there instead of dropping it.
      const atAnchor = extraOwnSlidesByAnchor.get(i) ?? [];
      atAnchor.push(j); // pushed in reverse (descending) order; reversed below once traceback finishes
      extraOwnSlidesByAnchor.set(i, atAnchor);
      j--;
    }
  }
  for (const ownIndices of extraOwnSlidesByAnchor.values()) ownIndices.reverse();

  let misalignedFromSlide: number | null = null;
  for (let refIndex = 1; refIndex <= n; refIndex++) {
    if (referenceToOwnIndex.get(refIndex) !== refIndex) {
      misalignedFromSlide = refIndex;
      break;
    }
  }

  return { referenceToOwnIndex, misalignedFromSlide, extraOwnSlidesByAnchor };
}
