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

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run lint     # oxlint
```

No environment variables, no server, no database to set up — it's a static SPA.
