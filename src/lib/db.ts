import Dexie, { type EntityTable } from "dexie";
import type { Show, Report } from "./types";

class DeckCheckDB extends Dexie {
  shows!: EntityTable<Show, "id">;
  reports!: EntityTable<Report, "id">;

  constructor() {
    super("DeckCheckDB");
    this.version(1).stores({
      shows: "id, name, createdAt, updatedAt",
      reports: "id, showId, createdAt",
    });
  }
}

export const db = new DeckCheckDB();

export async function createShow(name: string, notes: string | null = null): Promise<Show> {
  const now = Date.now();
  const show: Show = { id: crypto.randomUUID(), name, notes, createdAt: now, updatedAt: now };
  await db.shows.add(show);
  return show;
}

export async function deleteShow(showId: string): Promise<void> {
  // Dexie doesn't cascade-delete — remove the show's reports explicitly first.
  await db.transaction("rw", db.shows, db.reports, async () => {
    await db.reports.where("showId").equals(showId).delete();
    await db.shows.delete(showId);
  });
}

export async function deleteReport(reportId: string): Promise<void> {
  await db.reports.delete(reportId);
}

export async function touchShow(showId: string): Promise<void> {
  await db.shows.update(showId, { updatedAt: Date.now() });
}

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", db.shows, db.reports, async () => {
    await db.reports.clear();
    await db.shows.clear();
  });
}
