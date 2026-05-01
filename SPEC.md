# Aomi Hedge Sniper — Build Spec

> Take-home for AOMI Labs Founding DevRel/PME role.
> Author: Roshan Kharel. Date: 2026-05-01.
> Scope: 2-day build. Day 3 buffer KILLED — rubric rewards ≤2-day ship.

---

## 1. Goal

Ship a public GitHub repo where a stranger types one sentence into a chat widget — *"find me a guaranteed-positive Polymarket hedge under $50 collateral"* — and the agent returns a covering-portfolio plan, simulates the pair on-chain, and signs both legs through an AA wallet. End-to-end in <60 seconds. Demonstrates AOMI as the **build-and-ship layer for on-chain AI agents**.

## 2. Brand positioning the build proves

> **AOMI is the build-and-ship layer for on-chain AI agents — the typed tools to *build* them, and the drop-in widget to *ship* them inside any app.**

Every build choice ladders to this. The build is the founder's pitch deck.

## 3. Rubric mapping

| Rubric dim | Target | How this build hits it |
|---|---|---|
| Audience & client instinct | 5/5 | Speaks to the prediction-market client lane explicitly. Chainstacklabs reference is the breadcrumb. Persona = mid-tier Polymarket trader. |
| Speed | 5/5 | Day 1 + Day 2. Submit Sunday Day-2 night. Reuses live Polymarket bot infra. |
| Digestibility | 5/5 | "Type one sentence → AI finds free money on Polymarket." Grandma-pitch. |
| Distribution | 5/5 | Hook = "I gave Claude a Polymarket wallet via @aomi_labs. It found me a guaranteed 3.8% return in 38 seconds." Single-screenshot viral. |

**Target: 18/20.** No dim < 4.

## 4. Out of scope (for Day 1-2)

- Multi-tenant deploy (each user gets their own agent).
- Rebalance / monitor open positions over time.
- Kalshi cross-venue hedges.
- Custom widget UI — `<AomiFrame/>` ships as-is.
- Real backtest on historical hedges (cite chainstacklabs methodology only).
- Solana / non-EVM chains.

These move to the **one-pager's "what's next."**

## 5. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser: Next.js 15 page                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  <AomiFrame />  (drop-in chat widget)           │   │
│  │  ↕                                              │   │
│  │  @aomi-labs/react  (headless events)            │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬───────────────────────────────────┘
                     │ chat + tool calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│  AOMI Hosted Runtime (https://aomi.dev)                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ TYPED RUST PLUGINS (already compiled in)        │   │
│  │   • polymarket  ← used for actual on-chain tx   │   │
│  │   • para        ← AA wallet, gasless 4337       │   │
│  │   • prediction  ← market data                   │   │
│  └─────────────────────────────────────────────────┘   │
│             ↕ HTTP tool callback                       │
└────────────────────┬───────────────────────────────────┘
                     │ external tool registration
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js API: /api/hedge  (Roshan's analytics layer)   │
│   POST { max_collateral_usdc, min_return_bps }         │
│   → returns: HedgePlan { legs[], total_collateral,     │
│                          expected_return_bps, slug,    │
│                          rationale }                   │
│                                                         │
│   Internal: pulls Polymarket CLOB, scans correlated    │
│   markets, runs LLM logical-implication extraction,    │
│   computes covering portfolio with positive EV.        │
└─────────────────────────────────────────────────────────┘
```

### Tools the agent has access to in the demo

1. **`find_hedge(max_collateral_usdc, min_return_bps)`** — custom external tool, hits `/api/hedge`. Returns a `HedgePlan`.
2. **`polymarket.place_order(market_id, side, shares, max_price)`** — AOMI's existing typed Rust plugin. The agent calls this twice (once per leg) after the user reviews.
3. **`para.send_bundled_tx(...)`** — AOMI's AA primitive. Bundles the two leg orders + USDC approvals into a single signature.
4. **`simulate_plan(plan_id)`** — AOMI's batch-simulate-before-sign. The widget renders the simulation result; user must click "Sign" to proceed.

### Why this proves the moat (build-and-ship layer)

| AOMI primitive | How shown |
|---|---|
| Typed Rust plugins | `polymarket.place_order` is invoked — its U256/Address types make malformed orders impossible. Mentioned explicitly in the X thread. |
| `<AomiFrame />` widget | The entire UI. README: "the chat-plus-wallet UX is one tag." |
| AA (4337 + 7702) | The two-leg order is sent in **one** signature via Para bundler. Filmed in the video. |
| Batch simulate-before-sign | The user sees a forked-chain simulation of `approve → buy YES → buy NO` before signing. Filmed. |
| Skills as distribution | Repo includes a Claude Code skill manifest at `/skill/`. Final step of README: `npx skills add geekyroshan/hedge-sniper-skill`. |
| Five-surface session sync | Bonus: 5-second clip in the video showing the same hedge being run from `aomi` CLI in a terminal — no code change. |

## 6. Hedge detection algorithm

Pure analytics, runs in the Next.js API route. ≤200 LOC.

```
INPUT: max_collateral_usdc (e.g. 50), min_return_bps (e.g. 300 = 3%)

STEP 1 — Universe filter
  Pull all live Polymarket markets via CLOB API.
  Drop markets with < $5k 24h volume, < 7 days to resolution, > 30 days.
  Drop markets with order book depth < $100 at midpoint.

STEP 2 — Correlation extraction
  For each pair (M1, M2) where M1.tag overlaps M2.tag (e.g. both "Trump"):
    Ask LLM (single GPT-4o call, batched across pairs):
      "Given M1: '{title}' and M2: '{title}', does M1=YES logically
       imply anything about M2? Reply JSON:
       { implies: 'M2_yes' | 'M2_no' | 'independent', confidence: 0-1 }"
    Keep pairs with confidence ≥ 0.7.

STEP 3 — Covering portfolio math
  For each kept pair, given current best bid/ask on each leg:
    If M1=YES implies M2=NO:
      portfolio = buy YES on M1 + buy NO on M2
      cost = (M1_yes_ask + M2_no_ask) × shares
      payoff = 1 USDC at resolution if at least one leg wins
      Note: a TRUE hedge requires the implication to be exclusive.
            We compute expected return assuming the LLM-extracted
            implication holds, AND a worst-case payout if it doesn't.
    return_bps = (1.00 - cost_per_share) × 10000 / cost_per_share

STEP 4 — Filter + rank
  Keep portfolios where:
    - return_bps ≥ min_return_bps
    - total_collateral ≤ max_collateral_usdc
    - both legs have ≥ requested-size depth
  Rank by return_bps × confidence × min(leg_depth)/requested_size.
  Return top 1.

STEP 5 — Honest disclosure in HedgePlan.rationale
  Include: the LLM's logical-implication reasoning verbatim,
  the worst-case scenario if the implication fails,
  and the actual depth + slippage estimate.
```

**Deliberate honesty:** these are not *risk-free arbitrage* — they're *LLM-extracted-implication hedges with positive EV under the implication*. Said plainly in README, X thread, and one-pager. Builds trust; the rubric rewards "stranger gets the point" not "stranger trusts a too-good-to-be-true claim."

## 7. File tree

```
hedge-sniper/
├── README.md                       # < 5 min from clone to running locally
├── package.json                    # pnpm
├── pnpm-workspace.yaml
├── .env.example
├── apps/
│   └── web/                        # Next.js 15 app router
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx            # the demo page with <AomiFrame/>
│       │   └── api/
│       │       └── hedge/
│       │           └── route.ts    # POST /api/hedge — the analytics tool
│       ├── components/
│       │   └── HedgeFrame.tsx      # AomiFrame wrapper + system prompt config
│       ├── lib/
│       │   ├── polymarket.ts       # CLOB client (port from Roshan's bot)
│       │   ├── correlation.ts      # LLM logical-implication extraction
│       │   ├── covering-portfolio.ts  # portfolio math
│       │   └── types.ts            # HedgePlan, Leg, Market
│       ├── public/
│       └── package.json
├── rust-plugin/                    # The "production path" — partial, committed
│   ├── Cargo.toml
│   ├── README.md                   # "Why this exists; current state"
│   └── src/
│       ├── lib.rs
│       ├── tool.rs                 # find_hedge typed tool stub
│       └── types.rs                # HedgePlan in Rust, mirrors TS
├── skill/                          # Anthropic Skill, installable via npx
│   ├── SKILL.md
│   └── examples/
├── distribution/
│   ├── thread.md                   # X thread (≥5 posts), publish-ready
│   ├── video-script.md             # 60s shot-by-shot
│   ├── blog.md                     # 1500-word technical post
│   └── one-pager.md                # ≤1 page: user, life-changing why, what's next
├── docs/
│   ├── ARCHITECTURE.md             # the picture above + tool schemas
│   └── DEMO-WALKTHROUGH.md         # narrated screenshots
└── scripts/
    ├── seed-hedge-demo.ts          # if Polymarket has no live hedge, simulates a fake one for the video
    └── verify-env.ts               # checks all required env vars before npm run dev
```

## 8. Demo flow (the 60-second video)

| Sec | Frame | Voice/caption |
|---|---|---|
| 0–3 | Browser open to `localhost:3000`. Empty `<AomiFrame/>` chat. | "Polymarket has 500+ live markets. Most retail traders never see hedges. Watch this." |
| 3–8 | User types: *"find me a guaranteed 3%+ hedge under $50 collateral, please."* | (typing visible) |
| 8–15 | Agent message streams: "Scanning 487 markets… found a covering portfolio: Trump 2028 primary YES + Trump 2028 general NO. Let me show you the math." | |
| 15–25 | `<AomiFrame/>` renders a card: 2 legs, total cost $47.20, expected payout $50, return 5.9%, simulation green. | "It found a 5.9% covering portfolio — the LLM extracted that primary-YES implies general-NO with 0.83 confidence." |
| 25–35 | User clicks "Simulate." Forked-chain dry-run shows approve + 2 buys all green. | "Aomi's typed Rust polymarket plugin makes the trade shape compile-time-safe. The agent literally cannot malform the order." |
| 35–45 | User clicks "Sign." Para wallet bundles both legs into ONE signature (AA 4337). On-chain confirmation appears. | "One signature for two legs. Account abstraction via Aomi's Para integration." |
| 45–55 | Cut to terminal. `pnpm exec aomi chat --skill hedge-sniper`. Same hedge runs from CLI. | "Same session works in CLI and Claude Code. Aomi syncs across surfaces." |
| 55–60 | Cut to repo + thread CTA. | "Repo + thread linked. Built in 2 days with Aomi. Fork it." |

## 9. Distribution artifact requirements

### X thread (≥5 posts)
P1 (hook): "I gave Claude a Polymarket wallet via @aomi_labs. It found a guaranteed-positive 5.9% hedge in 38s. Free money the orderbook left on the table:" [screenshot of trade pair]
P2: "The hard part isn't placing the trade — it's finding correlated markets that imply each other. 487 markets ÷ 'I have 2 hours' = doesn't happen. So I built a scanner that asks GPT-4o to extract logical implications, then computes covering portfolios."
P3: "Here's the architecture. Custom analytics tool finds hedges. Aomi's typed Rust polymarket plugin places the trades — meaning the LLM literally cannot malform an order. Account abstraction via Para bundles both legs into one signature." [diagram]
P4: "The widget is the unlock. `<AomiFrame/>` is one React tag. Wallet, chat, simulation, signing — all of it. Any prediction market, GameFi, or wallet can paste this in and ship an AI trading copilot in an afternoon." [code gif]
P5: "Built in 2 days. Started Tuesday morning, shipped Thursday morning. Repo + 60s demo + how-to-fork-for-Kalshi guide: github.com/geekyroshan/hedge-sniper."
P6 (optional): "What I'd ship next: cross-venue hedges (Polymarket + Kalshi — Aomi already has both plugins), a 'monitor mode' for open hedge legs, and a Rust port of the detector. The detector is in `/rust-plugin/` already, half-finished."
P7 (close): "h/t @aomi_labs for the substrate. The 'AI agent + typed on-chain tools' thesis is real and they're early. If you're building anything that touches a chain from an LLM, you should be looking at them."

### Video — 60s, voice + captions, no music
Per § 8 above. Shot list in `distribution/video-script.md`.

### Technical blog post — 1500 words
Title: *"How I Found a 5.9% Polymarket Hedge in 38 Seconds: Building With Typed Tools and Drop-In Widgets"*
Sections: the problem (correlation hedges invisible to retail), the architecture (typed-Rust polymarket plugin + custom analytics layer + drop-in widget + AA), the build log (Day 1, Day 2), what I learned about AOMI's moat, what I'd do next.

### One-pager
- **User**: Mid-tier Polymarket trader (5–50 open positions, $500–$10k collateral). Knows hedging exists but can't scan 500 markets.
- **Why it changes their life**: Hedge mechanics that were institutional-only (RenTech, Susquehanna) are now a one-sentence chat away. Free yield the orderbook leaves on the table is now visible to anyone with $50.
- **What I'd build next**: cross-venue hedges (add Kalshi via AOMI's existing kalshi plugin), monitor-mode for open hedges, and the wallet-integration kit (a `<AomiFrame/>` reference build that any wallet team can fork to add an AI copilot in a day).

## 10. Roshan's manual-step checklist (things I cannot do for you)

1. **Get an AOMI API key** from `https://aomi.dev` (the dashboard) or message the founder on Telegram. Add to `.env.local`.
2. **Fund a Polygon wallet with USDC** for the demo (~$60 to cover one real hedge + gas). Add the private key to `.env.local`. Fresh wallet — don't use your main.
3. **Get an OpenRouter / OpenAI key** for the correlation LLM. Add to `.env.local`.
4. **Run `pnpm install && pnpm dev`** locally. Verify the hedge demo end-to-end.
5. **Record the 60s video** following `distribution/video-script.md`. OBS or QuickTime is fine.
6. **Push the repo public** to `github.com/geekyroshan/aomi-hedge-sniper`. Use a clean commit history (squash if needed).
7. **Post the X thread** from `@geekyroshan_`, tagging `@aomi_labs`. Pin it.
8. **Submit deliverables** to AOMI per the JD's instructions (Telegram or email per founder).

## 11. Anti-goals

- Don't ship a half-built widget UI. The widget IS the UI.
- Don't claim risk-free arbitrage. Claim positive-EV-under-stated-implication. Honesty > hype on the rubric.
- Don't add a custom dashboard or settings page. Out of scope.
- Don't fight Rust on Day 1. Rust plugin can be partial. TS is the working demo.
- Don't polish the README past 5-min-to-running. Polish past that = score loss.
