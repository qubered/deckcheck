import { parsePptx } from "../lib/pptx-parser";
import { buildComparisonReport } from "../lib/diff";
import type { DeckFingerprint, WorkerRequest, WorkerResponse } from "../lib/types";

function post(msg: WorkerResponse) {
  (self as unknown as Worker).postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, jobId, files, settings } = event.data;
  if (type !== "parse") return;

  try {
    const decks: DeckFingerprint[] = [];
    for (const file of files) {
      const deck = await parsePptx(file.deckId, file.filename, file.userLabel, file.buffer, (slidesParsed, totalSlides) => {
        post({ type: "progress", jobId, deckId: file.deckId, slidesParsed, totalSlides });
      });
      decks.push(deck);
      post({ type: "deckParsed", jobId, deck });
    }

    const report = buildComparisonReport(decks, settings);
    post({ type: "done", jobId, report });
  } catch (err) {
    post({ type: "error", jobId, message: err instanceof Error ? err.message : "Unknown parsing error" });
  }
};
