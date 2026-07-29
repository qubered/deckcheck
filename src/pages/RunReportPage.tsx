import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { db, touchShow } from "@/lib/db";
import { getSessionSettings, setSessionSettings } from "@/lib/sessionSettings";
import type { FlagSeverity, Report, ReportSettings, WorkerResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FileDropZone, type PendingFile } from "@/components/FileDropZone";

type DeckProgress = { filename: string; slidesParsed: number; totalSlides: number; done: boolean };

const selectClass =
  "w-full rounded-(--radius-md) border-2 border-(--color-line) bg-(--color-paper-2) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-red)";

export function RunReportPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [runLabel, setRunLabel] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, DeckProgress>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ReportSettings>(() => getSessionSettings(showId!));
  const workerRef = useRef<Worker | null>(null);

  function updateSettings(patch: Partial<ReportSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSessionSettings(showId!, next);
  }

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
        navigate(`/app/shows/${showId}/reports/${report.id}`);
      } else if (msg.type === "error") {
        setError(msg.message);
        setRunning(false);
        worker.terminate();
      }
    };

    worker.postMessage(
      { type: "parse", jobId, files: filePayloads, settings },
      filePayloads.map((f) => f.buffer),
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to={`/app/shows/${showId}`}
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

          <div>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="text-sm font-semibold text-(--color-ink-2) hover:text-(--color-red)"
            >
              {settingsOpen ? "▾" : "▸"} Report settings
            </button>
            {settingsOpen && (
              <Card className="mt-2 flex flex-col gap-4 p-4">
                <div>
                  <label className="mb-1 flex items-center justify-between text-sm font-semibold text-(--color-ink-2)">
                    <span>Text match threshold</span>
                    <span className="font-mono text-(--color-muted)">{Math.round(settings.fuzzyThreshold * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={1}
                    value={Math.round(settings.fuzzyThreshold * 100)}
                    onChange={(e) => updateSettings({ fuzzyThreshold: Number(e.target.value) / 100 })}
                    className="w-full accent-(--color-red)"
                  />
                  <p className="mt-1 text-xs text-(--color-muted)">
                    How similar slide text must be across decks to count as a match, below which it's flagged.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-(--color-ink-2)">Auto-advance transitions</label>
                  <select
                    className={selectClass}
                    value={settings.autoAdvanceSeverity}
                    onChange={(e) => updateSettings({ autoAdvanceSeverity: e.target.value as FlagSeverity })}
                  >
                    <option value="soft">Soft warning — flag but don't fail the slide</option>
                    <option value="hard">Hard mismatch — always fail a slide that auto-advances</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-(--color-ink-2)">Autoplay media</label>
                  <select
                    className={selectClass}
                    value={settings.autoplaySeverity}
                    onChange={(e) => updateSettings({ autoplaySeverity: e.target.value as FlagSeverity })}
                  >
                    <option value="soft">Soft warning — flag but don't fail the slide</option>
                    <option value="hard">Hard mismatch — always fail a slide with autoplay media</option>
                  </select>
                </div>
              </Card>
            )}
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
