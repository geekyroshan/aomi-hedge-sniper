# X Thread — Hedge Sniper

> Publish-ready. 7 posts. From `@geekyroshan_`. Tag `@aomi_labs` once (P3). No emoji.
> Voice ref: @suhailkakar/status/2037180287655043104 (cadence) + @aomi_labs posts.
> Each post ≤280 chars. Line breaks preserved for X readability.

---

## P1 — Hook (with screenshot)

I gave Claude a Polymarket wallet via @aomi_labs.

It returned a +6.38% expected-return covering portfolio in seconds.

Free yield the orderbook leaves on the table — under the LLM-extracted implication, worst case disclosed.

[image: distribution/screenshots/06-hero-card.webp]

---

## P2 — Why the problem is real

Polymarket has 500+ live markets.

Hedges live in correlated pairs — "Trump primary YES" implies "Trump general NO" if he loses the nomination. Positive EV sitting there.

But no human scans 500 markets at 3am.

So I gave the scanning job to an LLM.

---

## P3 — Architecture (with diagram)

The hard part isn't placing the trade. It's finding the pair.

I built an analytics tool that:
1. Pulls live Polymarket CLOB
2. Asks GPT-4o for logical implications between correlated markets
3. Computes a covering portfolio with positive EV under the implication

[image: docs/ARCHITECTURE.md diagram, rendered]

---

## P4 — Why this needed AOMI

The detector finds the trade. AOMI ships it.

`polymarket.place_order` is a typed Rust struct with U256 + Address types. The LLM literally cannot malform an order. That sentence is the whole pitch.

`<AomiFrame/>` is one React tag. Chat, wallet, sim, sign — all in there.

---

## P5 — Account abstraction in one line

Two legs. One signature.

The agent emits a plan: approve USDC → buy YES on M1 → buy NO on M2. The user clicks Sign once. Para's bundler does the rest via 4337.

Without AA you'd have the user signing 3 popups for what is, conceptually, one trade.

---

## P6 — Honest disclaimer (this is the rubric move)

Calling this "risk-free arbitrage" would be a lie.

It's positive-EV under the LLM-extracted implication. If the implication holds, you collect. If it fails, you eat a defined worst-case loss.

The README states this in plain English. No magic, no maxi vibes.

---

## P7 — Close + CTA

Built in 2 days on top of @aomi_labs.

What's next: cross-venue Kalshi hedges (they ship that plugin too), monitor mode for open legs, Rust port of the detector.

Repo + 60s demo: github.com/geekyroshan/aomi-hedge-sniper

If you're wiring an LLM to a chain, look at AOMI.
