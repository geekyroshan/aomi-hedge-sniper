import { HedgeFrame } from "@/components/HedgeFrame";

export default function HomePage() {
  // Determined at build time by next.config.mjs based on AOMI_API_KEY presence.
  const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === "1";

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm tracking-tight">aomi-hedge-sniper</span>
            <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted">
              built on @aomi-labs
            </span>
          </div>
          <a
            href="https://github.com/geekyroshan/hedge-sniper"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-muted hover:text-fg"
          >
            github →
          </a>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="flex h-[80vh] w-full max-w-3xl flex-col">
          <div className="mb-4">
            <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              Type one sentence. Get a positive-EV Polymarket hedge.
            </h1>
            <p className="mt-1 text-sm text-muted">
              The agent finds correlated markets, computes a covering portfolio, and places both legs in
              one bundled signature via AOMI&apos;s typed Polymarket plugin and Para account abstraction.
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <HedgeFrame mockMode={mockMode} />
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-4 font-mono text-xs text-muted">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
          <span>positive-EV under stated implication · not risk-free arbitrage · honesty &gt; hype</span>
          <a
            className="hover:text-fg"
            href="https://github.com/geekyroshan/hedge-sniper#readme"
            target="_blank"
            rel="noreferrer"
          >
            how the math works →
          </a>
        </div>
      </footer>
    </main>
  );
}
