---
name: hedge-sniper
description: >
  Use when the user wants to find or place a positive-EV covering portfolio
  on Polymarket — i.e. a pair of correlated markets whose union is forced to
  resolve true under an LLM-extracted logical implication. Triggers on
  phrases like "find me a hedge", "free money on Polymarket", "covering
  portfolio", "scan for arbitrage", "what's the best hedge under $X".
compatibility: "Best with Claude Code or Codex with the AOMI runtime running locally (`pnpm dev` from the hedge-sniper repo). The skill drives the chat surface and the AOMI polymarket plugin."
license: MIT
allowed-tools: Bash
metadata:
  author: geekyroshan
  version: "0.1"
  upstream: "https://github.com/geekyroshan/hedge-sniper"
---

# Hedge Sniper

Run AI-found Polymarket hedges from Claude Code, Codex, or any Anthropic
Skills-compatible client. Pairs with [@aomi-labs](https://aomi.dev) for the
on-chain execution layer.

## When to use

- "Find me a guaranteed-positive hedge on Polymarket under $50."
- "What's the best covering portfolio with confidence ≥ 0.8 right now?"
- "Place the hedge I just reviewed."
- "Show me the implication for that pair."

## What it does

1. POSTs to the local hedge-sniper analytics route (`/api/hedge`) which
   pulls live Polymarket markets, asks GPT-4o-mini to extract logical
   implications between correlated pairs, and returns the top covering
   portfolio.
2. Renders the plan with the LLM reasoning, confidence, and worst-case
   disclosure.
3. After explicit user approval, drives AOMI's typed `polymarket` plugin
   to place both legs and bundles them through Para AA into a single
   signature.

## Quick start

```bash
# 1. Clone the repo and install
git clone https://github.com/geekyroshan/hedge-sniper.git
cd hedge-sniper
pnpm install

# 2. Configure
cp .env.example .env.local
# fill in OPENAI_API_KEY (required for live scan)
# fill in AOMI_API_KEY (required for real on-chain placement)

# 3. Start
pnpm dev
```

## Surfaces

| Surface | Command |
|---|---|
| Browser (widget) | open http://localhost:3000 |
| AOMI CLI | `pnpm exec aomi chat --skill hedge-sniper` |
| Claude Code | this skill |
| Codex | this skill |

All four hit the same backend session via AOMI's runtime — start in a
browser, continue in a terminal.

## Honest limitations

- The implication confidence comes from a single GPT-4o-mini call. We drop
  pairs below 0.7 but `confidence` is not probability — never claim
  "risk-free arbitrage."
- The seed fallback (`scripts/seed-hedge-demo.ts`) is hand-crafted; it's
  used when the live CLOB scan returns nothing. The plan is flagged with
  `isSeeded: true` whenever this happens.
- Para AA requires an EOA-controlled smart-wallet on Polygon. First-run
  on-chain hedge will deploy the smart-wallet (one-time gas).

## Examples

See `examples/` for sample chat sessions:
- [`examples/find-50usdc-hedge.md`](examples/find-50usdc-hedge.md)
- [`examples/place-after-review.md`](examples/place-after-review.md)
