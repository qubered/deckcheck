import { DEFAULT_REPORT_SETTINGS, type ReportSettings } from "./types";

// Per-show report settings (fuzzy threshold), kept in-memory only rather than persisted to
// IndexedDB: they're a "how strict should this check be" dial for the current session, not part
// of the Show's durable record.
const settingsByShowId = new Map<string, ReportSettings>();

export function getSessionSettings(showId: string): ReportSettings {
  return settingsByShowId.get(showId) ?? DEFAULT_REPORT_SETTINGS;
}

export function setSessionSettings(showId: string, settings: ReportSettings): void {
  settingsByShowId.set(showId, settings);
}
