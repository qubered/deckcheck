# DeckCheck

A multi-screen PowerPoint sync checker — for town halls, conference rooms, video walls, or any
setup where the same content needs to run in sync across multiple displays driven by separate
files.

Drop 2+ `.pptx` files and get a per-slide diff report: text content, transitions, build/click
counts, and media autoplay — flagging anything out of sync before you present. Each deck can carry
an optional label of your own choosing; if you skip it, the deck is just identified by its
filename — there's nothing screen-specific hardcoded, so it works for any set of decks you need
kept in sync.

**100% client-side.** Everything — unzipping, parsing, diffing, and report rendering — runs in
your browser via a Web Worker. No backend, no upload endpoint, nothing about your decks ever
leaves the machine. Report history is saved locally via IndexedDB (Dexie); raw `.pptx` files are
never persisted, only the parsed diff results.

Content model: **Shows → Reports.** A Show is an event or presentation (an all-hands, a conference
session, a multi-room broadcast); a Report is one comparison run within it (first-draft check,
post-revision recheck, day-of final check, etc.).

Built on the [RVLT Flow design language](https://github.com/RVLT-Labs/rvlt-designlanguage/blob/main/DESIGN.md).

## Status

v1 MVP (positional alignment, fuzzy text match, transition auto-advance flagging, CSV export).
See the [build tracker](../../issues) for what's shipped and what's next (build/click counts,
media autoplay detection, fuzzy realignment for mismatched slide counts, PDF export).

## Getting started

### Prerequisites

- Node.js 20+ and npm (no other services, databases, or accounts needed)
- A modern evergreen browser (Chrome, Edge, Firefox, or Safari) — DeckCheck relies on Web
  Workers, the File API, and IndexedDB, all of which are standard in current browsers

### Run it locally

```bash
git clone <this-repo>
cd deckcheck
npm install
npm run dev
```

Then open the URL printed in the terminal (defaults to `http://localhost:5173`). No environment
variables, no server process, and no database to configure — it's a static single-page app.

To try it out: click **+ New Show**, name it, then **+ Run new report** and drop in 2 or more
`.pptx` files. Everything parses in your browser; nothing is uploaded anywhere.

### Other scripts

```bash
npm run build    # typecheck (tsc -b) + production build into dist/
npm run preview  # serve the production build locally, to sanity-check the built bundle
npm run lint     # oxlint
```

### Deploying

Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy-pages.yml`
(build → `actions/upload-pages-artifact` → `actions/deploy-pages`). Live at
`https://qubered.github.io/deckcheck/`. The app uses `HashRouter` (URLs like `/#/shows/:id`)
specifically so deep links keep working on Pages, which has no server-side rewrite for
history-mode routing.

`npm run build` also produces a fully static `dist/` folder on its own — it can be hosted
anywhere that serves static files if you'd rather point it elsewhere later (no server-side
runtime required either way).

### Data & privacy

Show/Report history is saved to your browser's IndexedDB (via Dexie) so it persists across
sessions on the same machine. Only parsed diff results are stored — raw `.pptx` files are never
written to disk or sent anywhere. Clearing your browser's site data for DeckCheck removes
everything; there's currently no bulk "clear all" button in the UI (tracked as a Phase 4
follow-up), but deleting Shows individually cascades to their Reports.
