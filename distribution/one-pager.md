# Aomi Hedge Sniper — One-Pager

> Take-home for AOMI Labs Founding DevRel/PME role.
> Roshan Kharel · `@geekyroshan_` · github.com/geekyroshan/aomi-hedge-sniper

![](screenshots/06-hero-card.png)

## The user

**Maya, mid-tier Polymarket trader.** 5–50 open positions, $500–$10k on collateral. Knows hedging exists. Has read the chainstacklabs alpha-bot post twice. Cannot scan 200+ markets at 3am between her day job and her toddler. The thinnest hedges — the ones with the best EV — disappear before she sees them. She's not an institution. She's the customer Polymarket actually has.

## Why this changes Maya's life

Hedge mechanics that were institutional-only — Renaissance, Susquehanna, the desks at Jane Street — are now one chat message away. Maya types *"find me a guaranteed 3%+ hedge under $50 collateral"* and the agent returns +6.38% expected return on a Trump 2028 primary YES + general NO covering portfolio, under the LLM-extracted implication, with worst case disclosed in plain English. Free yield the orderbook leaves on the table is now visible to anyone with $50.

The hedge isn't risk-free arbitrage — it's positive-EV under the LLM-extracted implication, with worst-case loss disclosed plainly in chat. Honest framing beats a too-good-to-be-true claim every time.

## Why I built it on AOMI

Three primitives the build cannot exist without:

- **Typed Rust polymarket plugin.** `place_order` is a struct with `U256`/`Address` types. The LLM cannot emit a malformed order — it doesn't compile. Real safety, not a docs claim.
- **`<AomiFrame/>` widget.** One React tag. Chat, wallet, simulation, signing. Zero wallet-connect code, zero paymaster wiring, zero forked-chain simulator. Three days of yak-shaving skipped.
- **Account abstraction (4337 + Para bundler).** Two legs, one signature. Without AA the second leg's price has moved by the time the user signs the second popup.

Cloning these on a JS agent kit is a 6–9 month Rust rewrite. I'd rather ship on the substrate that already has them.

## What I'd build next

1. **Cross-venue Kalshi hedges.** AOMI ships the Kalshi plugin. Many highest-EV pairs span venues — Polymarket's "Trump wins" priced against Kalshi's regulated equivalent.
2. **Monitor mode.** Watch open legs. Alert when depth dries up. Auto-unwind if EV inverts. Closes the loop from "find" to "manage."
3. **Wallet-integration kit.** A forkable `<AomiFrame/>` reference build any wallet team in AOMI's pipeline can deploy in a day. The hedge sniper is one customer use case; the kit is the *shape* of how every customer onboards. Every wallet team becomes a distribution surface.

Bullet three is the highest-leverage thing on the list. It's not a feature, it's a sales tool.

## A note on me

Five years shipping production AI for someone else's product — multi-tenant agent platforms, voice/multimodal at Dubai AI Summit, GDPR legal-tech RAG. The Polymarket bot I built six months ago (live, 11 trades, 63.6% WR) was the first thing I actually wanted to talk about publicly. AOMI is the role where building and distributing become the same job. That's the trade I want to make.

This one-pager, the thread, the video, and the repo were built as one artifact, in two days, with one model. Faster is the bet.

---

**Started:** ____________  **Shipped:** ____________  **(__ hours)**

*Roshan Kharel · roshan@allysai.com · @geekyroshan_*
