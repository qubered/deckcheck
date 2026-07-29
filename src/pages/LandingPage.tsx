import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GitHubIcon } from "@/components/GitHubIcon";
import { DoodleArrow, Squiggle, Sticker } from "@/components/Squiggle";

const REPO_URL = "https://github.com/qubered/deckcheck";

const STEPS = [
  { n: "1", color: "var(--color-module-show)", title: "Drop your decks", body: "2+ .pptx files. Label them or don't." },
  { n: "2", color: "var(--color-module-report)", title: "Parsed right here", body: "Unzipped and read in this tab. That's it." },
  { n: "3", color: "var(--color-module-deck)", title: "Get the diff", body: "Text, clicks, transitions, autoplay — flagged." },
  { n: "4", color: "var(--color-ok)", title: "Export or print", body: "CSV, or print straight from your browser." },
];

const FEATURES = [
  { color: "var(--color-module-show)", title: "Text diff", body: "Fuzzy-matches slide text, so a typo doesn't slip past as \"different.\"" },
  { color: "var(--color-module-report)", title: "Click-count matching", body: "One deck needs 4 clicks, another needs 3? Caught." },
  { color: "var(--color-module-deck)", title: "Autoplay detection", body: "Flags autoplaying video/audio, and whether every screen agrees." },
  { color: "var(--color-ok)", title: "Handles inserted slides", body: "One deck has an extra slide? It realigns instead of freaking out." },
];

// Loose scatter of decorative shapes behind the hero — no meaning, just texture.
function HeroConfetti() {
  const shapes = [
    { style: { top: "8%", left: "6%", rotate: -12 }, size: 22, kind: "circle", color: "var(--color-module-show)" },
    { style: { top: "18%", right: "9%", rotate: 18 }, size: 16, kind: "plus", color: "var(--color-module-deck)" },
    { style: { top: "62%", left: "3%", rotate: 8 }, size: 18, kind: "square", color: "var(--color-module-report)" },
    { style: { top: "72%", right: "5%", rotate: -20 }, size: 26, kind: "circle", color: "var(--color-ok)" },
    { style: { top: "2%", left: "42%", rotate: 6 }, size: 14, kind: "plus", color: "var(--color-red)" },
  ] as const;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-60">
      {shapes.map((s, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: "top" in s.style ? s.style.top : undefined,
            left: "left" in s.style ? s.style.left : undefined,
            right: "right" in s.style ? s.style.right : undefined,
            transform: `rotate(${s.style.rotate}deg)`,
          }}
        >
          {s.kind === "circle" && (
            <div style={{ width: s.size, height: s.size, borderColor: s.color }} className="rounded-full border-[3px]" />
          )}
          {s.kind === "square" && (
            <div style={{ width: s.size, height: s.size, borderColor: s.color }} className="rounded-md border-[3px]" />
          )}
          {s.kind === "plus" && (
            <div style={{ color: s.color, fontSize: s.size }} className="font-display font-black leading-none">
              +
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

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
      <header className="relative overflow-hidden px-6 pt-20 pb-14 text-center">
        <HeroConfetti />
        <p className="font-hand text-lg text-(--color-red)" style={{ display: "inline-block", transform: "rotate(-2deg)" }}>
          no server · no upload · no bs
        </p>
        <h1 className="relative mx-auto mt-3 max-w-2xl font-display text-4xl font-extrabold leading-tight text-(--color-ink) sm:text-5xl">
          Find the deck that's{" "}
          <span className="relative inline-block whitespace-nowrap">
            out of sync
            <Squiggle className="absolute -bottom-2 left-0 h-3 w-full" />
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg text-(--color-ink-2)">
          Drop 2+ PowerPoint files. Get a slide-by-slide diff — text, clicks, transitions, autoplay
          media. Runs entirely in your browser.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app">
            <Button>Open the app</Button>
          </Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <GitHubIcon className="h-4 w-4" />
              Star on GitHub
            </Button>
          </a>
        </div>
        <div className="mx-auto mt-12 flex max-w-lg flex-wrap items-center justify-center gap-4">
          <Sticker color="var(--color-module-show)" rotate={-6}>
            🔒 zero uploads
          </Sticker>
          <Sticker color="var(--color-module-report)" textColor="var(--color-espresso)" rotate={4}>
            🆓 free forever
          </Sticker>
          <Sticker color="var(--color-module-deck)" rotate={-3}>
            📖 MIT licensed
          </Sticker>
        </div>
      </header>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-2xl font-extrabold text-(--color-ink)">How it works</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card
              key={step.n}
              className="p-5"
              style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-(--radius-pill) font-display font-extrabold text-white"
                style={{ background: step.color }}
              >
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
          <h2 className="text-center font-display text-2xl font-extrabold text-(--color-ink)">What it catches</h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Card
                key={f.title}
                className="flex gap-4 p-5"
                style={{ transform: `rotate(${i % 2 === 0 ? 1 : -1}deg)` }}
              >
                <div
                  className="mt-0.5 h-10 w-10 shrink-0 rounded-(--radius-md) border-[3px] border-(--color-cream)"
                  style={{ background: f.color, transform: "rotate(-6deg)" }}
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
      <section className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-center font-hand text-lg text-(--color-red)" style={{ transform: "rotate(1deg)" }}>
          the important part
        </p>
        <h2 className="mt-2 text-center font-display text-3xl font-extrabold text-(--color-ink)">
          Your files never leave your computer
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-(--color-ink-2)">
          There's no upload button, because there's no server. A{" "}
          <code className="rounded bg-(--color-elevation) px-1.5 py-0.5 text-sm">.pptx</code> is just a zip file
          full of XML — your browser opens it directly, the same way it'd open any file on your computer, reads
          the slides, and compares them. Nothing gets sent anywhere. Ever.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div
            className="rounded-(--radius-md) border-2 border-(--color-line-2) bg-(--color-elevation) px-4 py-3 font-mono text-sm text-(--color-ink)"
            style={{ transform: "rotate(-2deg)" }}
          >
            your .pptx files
          </div>
          <span className="font-hand text-2xl text-(--color-muted)">↝</span>
          <div
            className="rounded-(--radius-md) border-[3px] border-dashed border-(--color-red) bg-(--color-red)/10 px-4 py-3 font-mono text-sm text-(--color-red)"
            style={{ transform: "rotate(1deg)" }}
          >
            unzipped, right here, in this tab
          </div>
          <span className="font-hand text-2xl text-(--color-muted)">↝</span>
          <div
            className="rounded-(--radius-md) border-2 border-(--color-line-2) bg-(--color-elevation) px-4 py-3 font-mono text-sm text-(--color-ink)"
            style={{ transform: "rotate(2deg)" }}
          >
            your report
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-(--color-faint)">No box in that diagram is a server. That's the whole trick.</p>

        <ul className="mx-auto mt-10 flex max-w-lg flex-col gap-3">
          {[
            "No servers, no cloud storage, no database with a copy of your decks.",
            "Parsing runs in a Web Worker — a background thread — so it doesn't freeze the tab.",
            "Report history lives in your browser's own storage (IndexedDB). There's no \"us\" for it to sync to.",
            "Close the tab and it's gone, unless you chose to keep it. Your call, not ours.",
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
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold text-(--color-ink)">MIT licensed. That's it.</h2>
          <p className="mx-auto mt-4 max-w-xl text-(--color-ink-2)">
            No account, no paywall, no "contact sales." Read the code, run it locally, fork it, self-host it,
            send a PR. It's yours as much as it's ours.
          </p>
          <div className="mt-6 inline-block rounded-(--radius-md) border-2 border-(--color-line-2) bg-(--color-elevation) px-5 py-3 text-left font-mono text-sm text-(--color-ink-2)">
            git clone {REPO_URL}.git
            <br />
            cd deckcheck &amp;&amp; npm install &amp;&amp; npm run dev
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Button>
                <GitHubIcon className="h-4 w-4" />
                View source
              </Button>
            </a>
            <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
              <Button variant="outline">Read the license</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative bg-(--color-red) px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-extrabold text-white">Go check your decks.</h2>
        <p className="mt-2 text-white/85">No install, no account, no waiting.</p>
        <div className="relative mt-6 inline-block">
          <Link to="/app">
            <Button variant="cream">Open the app</Button>
          </Link>
          <div className="absolute top-1/2 left-full ml-2 hidden -translate-y-1/2 items-center sm:flex">
            <DoodleArrow className="h-12 w-14 -scale-x-100 text-white" color="currentColor" />
            <span className="-ml-1 font-hand text-white/90" style={{ transform: "rotate(-3deg)" }}>
              yes, really
            </span>
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-sm text-(--color-faint)">
        <p>
          DeckCheck — MIT licensed, open source.{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline hover:text-(--color-red)">
            github.com/qubered/deckcheck
          </a>
        </p>
      </footer>
    </div>
  );
}
