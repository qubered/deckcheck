import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { db, createShow, deleteShow } from "@/lib/db";
import type { Show } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export function ShowListPage() {
  const shows = useLiveQuery(() => db.shows.orderBy("updatedAt").reverse().toArray(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();

  async function handleCreate() {
    if (!name.trim()) return;
    const show = await createShow(name.trim(), notes.trim() || null);
    setModalOpen(false);
    setName("");
    setNotes("");
    navigate(`/app/shows/${show.id}`);
  }

  async function handleDelete(showId: string, showName: string) {
    if (!confirm(`Delete "${showName}" and all of its reports? This can't be undone.`)) return;
    await deleteShow(showId);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <Link to="/" className="block">
          <p className="font-hand text-(--color-red)">multi-screen sync checker</p>
          <h1 className="font-display text-3xl font-extrabold text-(--color-ink)">DeckCheck</h1>
        </Link>
        <Button onClick={() => setModalOpen(true)}>+ New Show</Button>
      </header>

      {shows && shows.length === 0 && (
        <EmptyState
          title="No shows yet"
          description="A Show is an event or presentation — create one, then drop in your decks to run a comparison."
          action={<Button onClick={() => setModalOpen(true)}>+ New Show</Button>}
        />
      )}

      <div className="flex flex-col gap-3">
        {shows?.map((show) => (
          <ShowListCard key={show.id} show={show} onOpen={() => navigate(`/app/shows/${show.id}`)} onDelete={() => handleDelete(show.id, show.name)} />
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Show">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-(--color-ink-2)">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Q3 All-Hands — Sydney HQ"'
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-(--color-ink-2)">Notes (optional)</label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Location, date, stakeholders..." />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>
              Create Show
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ShowListCard({ show, onOpen, onDelete }: { show: Show; onOpen: () => void; onDelete: () => void }) {
  const reportCount = useLiveQuery(() => db.reports.where("showId").equals(show.id).count(), [show.id]);
  const latestReport = useLiveQuery(
    () => db.reports.where("showId").equals(show.id).reverse().sortBy("createdAt").then((r) => r[0] ?? null),
    [show.id],
  );

  return (
    <Card
      className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 hover:border-(--color-red)"
      onClick={onOpen}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-(--color-module-show)" />
          <h2 className="truncate font-display font-bold text-(--color-ink)">{show.name}</h2>
        </div>
        {show.notes && <p className="mt-1 truncate text-sm text-(--color-muted)">{show.notes}</p>}
        <p className="mt-1 text-xs text-(--color-faint)">
          {reportCount === undefined ? "…" : `${reportCount} report${reportCount === 1 ? "" : "s"}`} · updated{" "}
          {new Date(show.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {latestReport && (
          <Badge tone={latestReport.summary.issueCount > 0 ? "danger" : "ok"}>
            {latestReport.summary.issueCount > 0 ? `${latestReport.summary.issueCount} issue${latestReport.summary.issueCount === 1 ? "" : "s"}` : "Clean"}
          </Badge>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-(--color-faint) hover:text-(--color-timeout)"
          aria-label={`Delete ${show.name}`}
        >
          Delete
        </button>
      </div>
    </Card>
  );
}
