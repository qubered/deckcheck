import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GitHubIcon } from "@/components/GitHubIcon";

const REPO_URL = "https://github.com/qubered/deckcheck";

const STEPS = [
  {
    n: "1",
    title: "Drop your decks",
    body: "Drag in 2 or more .pptx files — one per screen, room, or feed. Label them if you like; it defaults to the filename.",
  },
  {
    n: "2",
    title: "Parsed in your browser",
    body: "Each file is unzipped and read locally, right where you dropped it. Nothing is sent anywhere.",
  },
  {
    n: "3",
    title: "Review the diff",
    body: "A per-slide report flags text mismatches, build/click count differences, auto-advancing transitions, and autoplay media.",
  },
  {
    n: "4",
    title: "Export or print",
    body: "Download a CSV, or print a clean report straight from your browser — no extra software.",
  },
];

const FEATURES = [
  {
    color: "var(--color-module-show)",
    title: "Text & content diff",
    body: "Fuzzy text matching catches typos, rewrites, and dropped lines between decks — not just exact mismatches.",
  },
  {
    color: "var(--color-module-report)",
    title: "Build & click-count matching",
    body: "Counts every click-triggered animation step per slide, so a deck that needs 4 clicks to play out doesn't quietly fall out of sync with one that needs 3.",
  },
  {
    color: "var(--color-module-deck)",
    title: "Media autoplay detection",
    body: "Flags autoplaying video or audio — and whether every screen agrees on it — since it's one of the easiest things to miss in a manual review.",
  },
  {
    color: "var(--color-ok)",
    title: "Handles inserted slides",
    body: "If one deck has an extra or missing slide, DeckCheck realigns the rest by content instead of cascading a false mismatch through the whole deck.",
  },
];

export function LandingPage() {
  return (
    <div>
      <nav className="sticky top-0 z-40 border-b-2 border-(--color-line) bg-(--color-paper)/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-extrabold text-(--color-ink)">DeckCheck</span>
          <div className="flex items-center gap-4">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 text-sm text-(--color-ink-2) hover:text-(--color-red) sm:flex"
            >
              <GitHubIcon className="h-4 w-4" />
              Source
            </a>
            <Link to="/app">
              <Button>Open the app</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden px-6 pt-20 pb-16 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px]"
          style={{
            background: "radial-gradient(ellipse 800px 400px at 50% 0%, rgba(224,54,61,0.11), transparent 70%)",
          }}
        />
        <p className="font-hand text-lg text-(--color-red)">free · open source · runs entirely in your browser</p>
        <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-extrabold leading-tight text-(--color-ink) sm:text-5xl">
          Make sure every screen tells{" "}
          <span className="underline decoration-(--color-red) decoration-4 underline-offset-4">the same story</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-(--color-ink-2)">
          DeckCheck compares PowerPoint decks running across multiple screens — a town hall, a set of meeting rooms,
          a bank of displays — and flags anything out of sync before you present: mismatched text, mismatched click
          counts, transitions that auto-advance, media that autoplays.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app">
            <Button>Open the app — it's free</Button>
          </Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <GitHubIcon className="h-4 w-4" />
              View on GitHub
            </Button>
          </a>
        </div>
        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-(--color-muted)">
          <span>🔒 Nothing you upload — there's no upload</span>
          <span>🆓 Free, no account, no limits</span>
          <span>📖 Open source, MIT licensed</span>
        </div>
      </header>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-2xl font-extrabold text-(--color-ink)">How it works</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <Card key={step.n} className="p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-(--radius-pill) bg-(--color-red) font-display font-extrabold text-white">
                {step.n}
              </div>
              <h3 className="font-display font-bold text-(--color-ink)">{step.title}</h3>
              <p className="mt-1.5 text-sm text-(--color-muted)">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-(--color-paper-2) px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-extrabold text-(--color-ink)">
            What it catches
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <Card key={f.title} className="flex gap-4 p-5">
                <div
                  className="mt-0.5 h-10 w-10 shrink-0 rounded-(--radius-md) border-2 border-(--color-line-2)"
                  style={{ background: f.color }}
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-display font-bold text-(--color-ink)">{f.title}</h3>
                  <p className="mt-1 text-sm text-(--color-muted)">{f.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 100% client-side, explained simply */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-center font-hand text-(--color-red)">the important part</p>
        <h2 className="mt-2 text-center font-display text-3xl font-extrabold text-(--color-ink)">
          Your files never leave your computer
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-(--color-ink-2)">
          There's no upload button in DeckCheck, because there's nothing to upload to — there's no server at all.
          In plain terms: a <code className="rounded bg-(--color-elevation) px-1.5 py-0.5 text-sm">.pptx</code> file
          is really just a zip file full of XML. When you drop your decks in, your browser opens that zip file
          itself — the same way it can open any file on your computer — reads the slides inside, and compares them.
          The whole thing happens on your machine, in the tab you have open, and nothing about your decks is ever
          sent anywhere.
        </p>

        <Card className="mt-10 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-4 sm:text-left">
            <div className="rounded-(--radius-md) border-2 border-(--color-line-2) bg-(--color-elevation) px-4 py-3 font-mono text-sm text-(--color-ink)">
              your decks
            </div>
            <span className="text-(--color-muted)">→</span>
            <div className="rounded-(--radius-md) border-2 border-(--color-red) bg-(--color-red)/10 px-4 py-3 font-mono text-sm text-(--color-red)">
              unzipped &amp; compared in your browser tab
            </div>
            <span className="text-(--color-muted)">→</span>
            <div className="rounded-(--radius-md) border-2 border-(--color-line-2) bg-(--color-elevation) px-4 py-3 font-mono text-sm text-(--color-ink)">
              your report
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-(--color-faint)">
            No arrow ever points off this page — that's the whole architecture.
          </p>
        </Card>

        <ul className="mx-auto mt-10 flex max-w-xl flex-col gap-4">
          {[
            "No servers, no cloud storage, no database holding a copy of your decks.",
            "Comparisons run in a Web Worker — a background thread inside your own browser — so even a big check doesn't freeze the page.",
            "Report history is saved only in your browser's own local storage (IndexedDB). Nothing syncs to us, because there's no \"us\" to sync to.",
            "Close the tab, clear your browser data, or just don't save the report — either way, nothing about your decks persists anywhere you don't control.",
          ].map((line) => (
            <li key={line} className="flex gap-3 text-sm text-(--color-ink-2)">
              <span className="text-(--color-ok)">✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Free & open source */}
      <section className="bg-(--color-paper-2) px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-extrabold text-(--color-ink)">Free. Forever. No catch.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-(--color-ink-2)">
            DeckCheck is fully open source under the MIT license. No account, no sign-up, no usage limits, no
            paid tier waiting behind a feature you actually need. Read every line of what it does with your files,
            self-host it, fork it, or send a pull request — it's yours as much as it's ours.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Button>
                <GitHubIcon className="h-4 w-4" />
                View source on GitHub
              </Button>
            </a>
            <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
              <Button variant="outline">MIT License</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-(--color-red) px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-extrabold text-white">Ready to check your decks?</h2>
        <p className="mt-2 text-white/85">No install, no account — just open it and drop your files in.</p>
        <Link to="/app" className="mt-6 inline-block">
          <Button variant="cream">Open the app</Button>
        </Link>
      </section>

      <footer className="px-6 py-10 text-center text-sm text-(--color-faint)">
        <p>
          DeckCheck — open source, MIT licensed.{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline hover:text-(--color-red)">
            github.com/qubered/deckcheck
          </a>
        </p>
      </footer>
    </div>
  );
}
