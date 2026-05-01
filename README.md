# Hedge Sniper

> AI finds positive-EV Polymarket hedges. AOMI signs both legs in one transaction.

![Hedge plan card showing +6.38% expected return on a Trump 2028 primary/general covering portfolio](distribution/screenshots/06-hero-card.png)

Built for the [AOMI Labs](https://aomi.dev) founding DevRel/PME take-home.
Two days. Public repo. Working demo.

> *I gave Claude a Polymarket wallet via @aomi_labs. It returned a +6.38%
> expected-return covering portfolio in seconds. Free yield the order book
> leaves on the table — under the LLM-extracted implication, with worst case
> disclosed.*

## What it does

A user types one sentence — *"find me a 3%+ hedge under $50"* — and the
agent:

1. Pulls 200+ active Polymarket markets from the Gamma API.
2. Filters by 24h volume, depth, and resolution window.
3. Buckets pairs by shared tag, asks **GPT-4o-mini** for a strict-JSON
   logical-implication extraction. Drops pairs below 0.7 confidence.
4. Computes a covering portfolio per surviving pair: cost, expected
   return under the implication, worst-case payoff, sized by min budget
   and order-book depth.
5. Returns the highest-scoring plan with the LLM's reasoning attached.
6. After explicit user approval, places **both legs in one bundled
   signature** through AOMI's typed-Rust polymarket plugin and Para AA.

The hedge math is positive-EV under the LLM-extracted implication —
**not** risk-free arbitrage. The honesty disclaimer is in every plan card.

## Demo flow

| Step | Screenshot | What's happening |
|---|---|---|
| 1. User opens widget | ![](distribution/screenshots/01-empty.png) | Empty AomiFrame chat |
| 2. Types prompt | ![](distribution/screenshots/02-typed.png) | "find me a 3%+ hedge under $50" |
| 3. Plan card renders | ![](distribution/screenshots/03-plan.png) | +6.38% covering portfolio, both legs, honesty disclaimer |
| 4. Simulate | ![](distribution/screenshots/04-simulated.png) | Forked-chain dry-run green |
| 5. Sign | ![](distribution/screenshots/05-signed.png) | Para AA bundles both legs into one signature |

## Quickstart

Six commands, ≤5 minutes from clone to running:

```bash
git clone https://github.com/geekyroshan/hedge-sniper && cd hedge-sniper
cp .env.example .env.local                          # fill in keys (see below)
pnpm install
pnpm verify-env                                     # human-readable env check
pnpm dev                                            # http://localhost:3000
pnpm exec aomi chat --skill hedge-sniper            # (optional) same hedge from CLI
```

### Required env keys

| Key | Required? | Why |
|---|---|---|
| `AOMI_API_KEY` | optional* | LIVE mode — places real orders through AOMI's runtime. Without it, MOCK MODE. |
| `AOMI_BASE_URL` | optional | Defaults to `https://aomi.dev`. |
| `OPENAI_API_KEY` | optional* | Live correlation extraction. Without it, the API serves the seed plan when called with `x-allow-seed: 1`. |
| `POLYGON_RPC_URL` | optional | Defaults to public Polygon RPC. |
| `WALLET_PRIVATE_KEY` | optional* | Signs the bundled tx in LIVE mode. Use a fresh wallet, ~$60 USDC funding. |
| `NEXT_PUBLIC_AOMI_APP` | optional | Which AOMI plugin to load. Defaults to `polymarket`. |

\* "Optional" means the demo runs without it (MOCK mode). For a real
on-chain hedge, set all four marked.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser: Next.js 15 page                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  <HedgeFrame /> — chat UI (uses @aomi-labs/react)│   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬───────────────────────────────────┘
                     │ chat + tool calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│  AOMI Hosted Runtime (https://aomi.dev)  [LIVE MODE]   │
│   • polymarket plugin (typed Rust, 6 tools)            │
│   • para plugin (4337/7702 AA bundling)                │
│   • prediction plugin (market data)                    │
└────────────────────┬───────────────────────────────────┘
                     │ external tool registration
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js API: /api/hedge  (this repo)                  │
│   POST { maxCollateralUsdc, minReturnBps }             │
│   → HedgePlan { legs[], total_collateral,              │
│                 expected_return_bps, rationale }       │
└─────────────────────────────────────────────────────────┘
```

Full picture + tool schemas: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## How the hedge math works

In one paragraph: pick a pair (M1, M2) where the LLM says *M1=YES implies
M2=NO* with confidence ≥ 0.7. Buy YES on M1 at price `p1`, NO on M2 at
price `p2`. Cost per pair-share is `p1 + p2`; payoff is **1 USDC** if
either side wins. Return = `(1 − cost) / cost`. Size by min(budget,
leg1 depth, leg2 depth). Rank candidates by `expected_return × confidence
× depth/cost` and return the top one.

The full algorithm lives in [`apps/web/lib/covering-portfolio.ts`](apps/web/lib/covering-portfolio.ts)
(`<200 LOC` total across the three lib files), and is spec'd in
[SPEC.md §6](SPEC.md#6-hedge-detection-algorithm).

## How AOMI shows up (the moat-mapping table)

| AOMI primitive | How shown in this build |
|---|---|
| **Typed Rust plugins** | `polymarket.*` calls have compile-time-validated args. The LLM can't malform a tx. Mirrored Rust types in [`rust-plugin/src/types.rs`](rust-plugin/src/types.rs). |
| **`<AomiFrame/>` widget** | `<HedgeFrame/>` wraps `@aomi-labs/react`. Production swap is `npx shadcn add @aomi-labs/widget-lib/aomi-frame`. |
| **AA (4337 + 7702)** | Two leg orders + USDC approval bundled into one Para signature. |
| **Batch simulate-before-sign** | The "Simulate" button runs a forked-chain dry-run before any signature. UI surfaces per-step result. |
| **Skills as distribution** | This repo ships an Anthropic Skill at [`skill/SKILL.md`](skill/SKILL.md). Installable via `npx skills add geekyroshan/hedge-sniper`. |
| **Five-surface session sync** | Same hedge runs from the CLI (`pnpm exec aomi chat --skill hedge-sniper`). |

## Fork it for Kalshi

AOMI already ships a [`kalshi` plugin](https://github.com/aomi-labs/aomi-sdk/tree/main/apps/kalshi).
Three things change:

1. **`apps/web/lib/polymarket.ts`** → `kalshi.ts`. Swap the Gamma + CLOB
   endpoints for Kalshi's market-data API and order endpoint.
2. **`apps/web/lib/correlation.ts`** — no change. Logical-implication
   extraction is venue-agnostic.
3. **`apps/web/lib/system-prompt.ts`** — change `polymarket.*` plugin
   references to `kalshi.*`. (Or keep both; the agent uses whichever
   plugin owns each leg.)

For cross-venue hedges (Polymarket leg + Kalshi leg), the analytics
function returns mixed-source legs and the system prompt instructs the
agent to call the right plugin per leg. AOMI's typed-tool model means
you can't accidentally route a Polymarket order through the Kalshi
plugin — wrong types, won't compile.

## Limitations & honesty notes

- **MOCK MODE is the default**, because no reviewer has my `AOMI_API_KEY`.
  The widget renders, the analytics tool runs (with `OPENAI_API_KEY`),
  but the "Sign" button shows a mock confirmation hash. To flip to LIVE,
  set `AOMI_API_KEY` and restart `pnpm dev`.
- **The Rust plugin is a stub.** Working analytics live in TS at
  `apps/web/`. The Rust crate at `rust-plugin/` is the documented
  migration target — see [`rust-plugin/README.md`](rust-plugin/README.md).
  Cargo.toml git-deps `aomi-sdk`; once available locally, run `cargo
  check --features plugin`.
- **The widget is the headless runtime + custom React, not
  `@aomi-labs/widget-lib/aomi-frame`.** The shadcn registry install
  (`npx shadcn add ...`) pulls 25+ deps including Para SDK + wagmi which
  needs additional provider setup — out of scope for a 2-day build. The
  production swap is documented in
  [`apps/web/components/HedgeFrame.tsx`](apps/web/components/HedgeFrame.tsx).
- **The seed plan** in `scripts/seed-hedge-demo.ts` is hand-crafted with
  realistic Trump-2028 numbers. The plan card flags `isSeeded: true` so
  reviewers can tell. It's used as a fallback when the live CLOB scan
  returns nothing matching the user's thresholds.
- **GPT-4o-mini is cheap but not perfect.** ~$0.001 per scan. We drop
  pairs below 0.7 confidence and surface confidence on every plan. Never
  claim "risk-free."

## What's next (if I had another week)

See **[docs/ROADMAP.md](docs/ROADMAP.md)**. Short version: cross-venue
hedges (Kalshi+Polymarket via AOMI's existing plugins), monitor mode for
open hedge legs, Rust port of the detector, backtest engine.

## Distribution artifacts

- [X thread (≥5 posts, publish-ready)](distribution/thread.md)
- [60s video script](distribution/video-script.md)
- [Technical blog post (~1500 words)](distribution/blog.md)
- [One-pager](distribution/one-pager.md)

## Repo layout

```
hedge-sniper/
├── README.md                       # this file
├── SPEC.md                         # the build spec — the contract
├── package.json, pnpm-workspace.yaml
├── .env.example
├── apps/web/                       # Next.js 15 app router
│   ├── app/
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   └── api/hedge/route.ts      # the analytics tool
│   ├── components/HedgeFrame.tsx   # the chat UI
│   ├── lib/
│   │   ├── types.ts                # HedgePlan, Leg, Market
│   │   ├── polymarket.ts           # CLOB + Gamma client
│   │   ├── correlation.ts          # LLM implication extractor
│   │   ├── covering-portfolio.ts   # the math
│   │   ├── system-prompt.ts        # what the agent sees
│   │   ├── seed.ts                 # demo fallback
│   │   └── aomi-mock.ts            # mock-mode helpers
├── rust-plugin/                    # production migration target (stub)
├── skill/SKILL.md                  # Anthropic Skill manifest
├── distribution/                   # thread, video, blog, one-pager
├── docs/                           # architecture, demo, roadmap
└── scripts/                        # verify-env, seed-hedge-demo
```

## License

MIT. Built by [Roshan Kharel](https://github.com/geekyroshan) (`@geekyroshan_`)
with [Claude Code](https://claude.com/claude-code) as a pair-programmer.
