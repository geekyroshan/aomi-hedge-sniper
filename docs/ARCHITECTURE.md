# Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser: Next.js 15 page (apps/web/app/page.tsx)      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  <HedgeFrame /> — chat UI                        │   │
│  │    • mock mode: calls /api/hedge directly        │   │
│  │    • live mode: wraps @aomi-labs/react           │   │
│  │      AomiRuntimeProvider (headless)              │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬───────────────────────────────────┘
                     │ chat + tool calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│  AOMI Hosted Runtime (https://aomi.dev)  [LIVE MODE]   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ TYPED RUST PLUGINS                              │   │
│  │   • polymarket   — search → resolve intent →    │   │
│  │                    build order → submit order    │   │
│  │   • para         — AA wallet, gasless 4337/7702 │   │
│  │   • prediction   — market data                  │   │
│  └─────────────────────────────────────────────────┘   │
│             ↕ HTTP tool callback                       │
└────────────────────┬───────────────────────────────────┘
                     │ external tool registration
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js API: /api/hedge  (analytics layer, this repo) │
│   POST { maxCollateralUsdc, minReturnBps }             │
│   → returns: HedgePlan { legs[], total_collateral,     │
│                          expected_return_bps, slug,    │
│                          rationale }                   │
│                                                         │
│   Internal:                                            │
│     1. fetchActiveMarkets() — Polymarket Gamma API     │
│     2. enrichWithOrderBook() — Polymarket CLOB API     │
│     3. buildCandidatePairs() — bucket by tag           │
│     4. extractImplications() — GPT-4o-mini, JSON-mode  │
│     5. buildPlan() — covering portfolio math           │
│     6. pickBest() — score by return × confidence × depth│
└─────────────────────────────────────────────────────────┘
```

## Tools the agent has

The system prompt (`apps/web/lib/system-prompt.ts`) instructs the LLM to
call these in order:

1. **`find_hedge(maxCollateralUsdc, minReturnBps)`** — our analytics tool,
   exposed as a custom external tool to the AOMI runtime. Returns a
   `HedgePlan` (see `apps/web/lib/types.ts`).
2. **`polymarket.search_polymarket(...)`** — AOMI typed Rust plugin tool;
   used to verify the legs the analytics layer suggested are still on the
   live CLOB.
3. **`polymarket.resolve_polymarket_trade_intent(...)`** — turns the human
   intent ("buy 50 YES on market X at ≤$0.32") into a typed order shape.
4. **`polymarket.build_polymarket_order(...)`** — computes the EIP-712
   typed-data payload the wallet must sign.
5. **`polymarket.submit_polymarket_order(...)`** — submits the signed
   order to the CLOB once the wallet returns a signature.
6. **`para.send_bundled_tx(...)`** — bundles the two leg orders + the
   USDC approval into a single signature via 4337.

The agent calls these in sequence per leg; the AOMI runtime queues wallet
signatures and the user reviews + signs once.

## Why this proves the moat

| AOMI primitive | How shown in this build |
|---|---|
| Typed Rust plugins | `polymarket.*` calls have compile-time-validated args. The LLM literally can't malform a tx. The Rust types in `rust-plugin/src/types.rs` mirror `apps/web/lib/types.ts` to make this visible. |
| `<AomiFrame/>` widget | The whole UI is one component. README documents the production `npx shadcn add @aomi-labs/widget-lib/aomi-frame` swap. |
| AA (4337 + 7702) | Two leg orders + USDC approval bundled into one Para signature. |
| Batch simulate-before-sign | The "Simulate" button calls AOMI's forked-chain simulator before signing. UI shows the per-step result. |
| Skills as distribution | `skill/SKILL.md` makes the demo installable in Claude Code via `npx skills add geekyroshan/hedge-sniper`. |
| Five-surface session sync | Same hedge runs from `pnpm exec aomi chat --skill hedge-sniper` via the CLI. |
