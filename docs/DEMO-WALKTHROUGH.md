# Demo walkthrough

A 60-second narrated tour of the build. Pair this with `distribution/video-script.md` when recording.

## 0:00 — Empty chat

Open `localhost:3000`. The widget shows:
- Header: `aomi-hedge-sniper · built on @aomi-labs`
- Single greeting message from the agent
- Composer at the bottom with three suggested prompts
- (If MOCK mode) yellow banner: "Running in MOCK MODE — set AOMI_API_KEY to enable on-chain placement"

## 0:05 — Type the prompt

Click the suggested prompt or type:
> *"find me a guaranteed 3%+ hedge under $50 please"*

## 0:10 — Agent scans

The agent posts: *"Scanning Polymarket… target: ≤$50 USDC collateral, ≥3.0% return."*

Behind the scenes, `/api/hedge` is running steps 1–6 from SPEC §6:
1. fetch active markets (Gamma)
2. pull order books for the top 60 by 24h volume
3. bucket by shared tag → candidate pairs
4. ask GPT-4o-mini for logical implications
5. compute covering portfolio per surviving pair
6. rank, return top 1

Median scan time on a warm cache: 8–12 seconds.

## 0:20 — Plan card renders

A card appears with two legs, total collateral, expected return, and the
LLM's verbatim reasoning. The honesty disclaimer is in italics at the
bottom of the card (yellow accent).

## 0:30 — User clicks "Simulate"

The agent posts: *"Calling AOMI batch-simulate-before-sign on the forked
chain…"* and follows up with the per-step simulation result. This is the
moment that lands the safety story for prediction-market clients.

## 0:40 — User clicks "Sign & place both legs"

In LIVE mode: `polymarket.build_polymarket_order` runs twice (one per
leg), `para.send_bundled_tx` wraps both + the USDC approval, the user
signs ONCE. The AOMI runtime returns the bundle hash and per-leg fill
prices.

In MOCK mode: a fake bundle hash is shown with the label "Mock confirmation."

## 0:55 — CLI cut (optional bonus shot)

```bash
pnpm exec aomi chat --skill hedge-sniper
```

Same prompt, same hedge, same session. Demonstrates AOMI's five-surface
session sync.
