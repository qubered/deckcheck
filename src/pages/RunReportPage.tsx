import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { db, touchShow } from "@/lib/db";
import { DEFAULT_FUZZY_THRESHOLD } from "@/lib/diff";
import type { Report, WorkerResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FileDropZone, type PendingFile } from "@/components/FileDropZone";

type DeckProgress = { filename: string; slidesParsed: number; totalSlides: number; done: boolean };

export function RunReportPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [runLabel, setRunLabel] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, DeckProgress>>({});
  const workerRef = useRef<Worker | null>(null);

  async function handleRun() {
    if (files.length < 2 || !showId) return;
    setRunning(true);
    setError(null);

    const jobId = crypto.randomUUID();
    const deckMeta = files.map((pf) => ({ id: crypto.randomUUID(), pf }));
    setProgress(
      Object.fromEntries(
        deckMeta.map(({ id, pf }) => [id, { filename: pf.file.name, slidesParsed: 0, totalSlides: 0, done: false }]),
      ),
    );

    const filePayloads = await Promise.all(
      deckMeta.map(async ({ id, pf }) => ({
        deckId: id,
        filename: pf.file.name,
        userLabel: pf.label.trim() || null,
        buffer: await pf.file.arrayBuffer(),
      })),
    );

    const worker = new Worker(new URL("../workers/parser.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.onmessage = async (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      if (msg.jobId !== jobId) return;

      if (msg.type === "progress") {
        setProgress((prev) => ({
          ...prev,
          [msg.deckId]: { ...prev[msg.deckId], slidesParsed: msg.slidesParsed, totalSlides: msg.totalSlides },
        }));
      } else if (msg.type === "deckParsed") {
        setProgress((prev) => ({
          ...prev,
          [msg.deck.deckId]: { ...prev[msg.deck.deckId], done: true },
        }));
      } else if (msg.type === "done") {
        const report: Report = {
          id: crypto.randomUUID(),
          showId,
          runLabel: runLabel.trim() || null,
          createdAt: Date.now(),
          deckLabels: msg.report.decks.map((d) => d.userLabel?.trim() || d.filename),
          summary: {
            totalSlides: msg.report.summary.totalAlignedSlides,
            issueCount: msg.report.summary.issueCount,
          },
          fullReport: msg.report,
        };
        await db.reports.add(report);
        await touchShow(showId);
        worker.terminate();
        navigate(`/shows/${showId}/reports/${report.id}`);
      } else if (msg.type === "error") {
        setError(msg.message);
        setRunning(false);
        worker.terminate();
      }
    };

    worker.postMessage(
      { type: "parse", jobId, files: filePayloads, fuzzyThreshold: DEFAULT_FUZZY_THRESHOLD },
      filePayloads.map((f) => f.buffer),
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to={`/shows/${showId}`}
        className="mb-4 inline-block text-sm text-(--color-muted) hover:text-(--color-red)"
      >
        ← Back to show
      </Link>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-(--color-ink)">Run a new report</h1>

      {!running ? (
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <FileDropZone files={files} onFilesChange={setFiles} />
          </Card>

          <div>
            <label className="mb-1 block text-sm font-semibold text-(--color-ink-2)">Run label (optional)</label>
            <Input
              value={runLabel}
              onChange={(e) => setRunLabel(e.target.value)}
              placeholder='e.g. "First draft check"'
            />
          </div>

          {error && (
            <div className="rounded-(--radius-md) border-2 border-(--color-timeout) bg-(--color-timeout)/10 px-4 py-3 text-sm text-(--color-timeout)">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleRun} disabled={files.length < 2}>
              Run comparison {files.length > 0 && `(${files.length} files)`}
            </Button>
          </div>
          {files.length === 1 && (
            <p className="text-right text-sm text-(--color-muted)">Add at least one more deck to compare.</p>
          )}
        </div>
      ) : (
        <Card className="flex flex-col gap-4 p-6">
          <p className="text-sm text-(--color-muted)">Parsing decks locally in your browser…</p>
          {Object.entries(progress).map(([deckId, p]) => (
            <div key={deckId}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="truncate text-(--color-ink)">{p.filename}</span>
                <span className="text-(--color-muted)">
                  {p.done ? "Done" : p.totalSlides > 0 ? `${p.slidesParsed}/${p.totalSlides} slides` : "Reading…"}
                </span>
              </div>
              <ProgressBar value={p.done ? 1 : p.slidesParsed} max={p.done ? 1 : p.totalSlides || 1} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
