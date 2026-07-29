# DeckCheck

A multi-screen PowerPoint sync checker for LED wall / multi-surface event production.

Drop 2+ `.pptx` files for a show (Wide, Twins, Pillars, or any screen labels you use) and get a
per-slide diff report: text content, transitions, and (coming in Phase 2) build/click counts and
media autoplay — flagging anything out of sync before a show.

**100% client-side.** Everything — unzipping, parsing, diffing, and report rendering — runs in
your browser via a Web Worker. No backend, no upload endpoint, nothing about your decks ever
leaves the machine. Report history is saved locally via IndexedDB (Dexie); raw `.pptx` files are
never persisted, only the parsed diff results.

Content model: **Shows → Reports.** A Show is an event/production; a Report is one comparison run
within it (first-draft check, post-revision recheck, day-of final, etc.).

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

`npm run build` produces a fully static `dist/` folder — it can be hosted anywhere that serves
static files (no server-side runtime required). Where to host it hasn't been decided yet; see the
open decisions in the build tracker.

### Data & privacy

Show/Report history is saved to your browser's IndexedDB (via Dexie) so it persists across
sessions on the same machine. Only parsed diff results are stored — raw `.pptx` files are never
written to disk or sent anywhere. Clearing your browser's site data for DeckCheck removes
everything; there's currently no bulk "clear all" button in the UI (tracked as a Phase 4
follow-up), but deleting Shows individually cascades to their Reports.
