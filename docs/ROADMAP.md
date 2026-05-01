# Roadmap

Things deliberately out of scope for the 2-day take-home, listed positively
(things to ship next, not things missing).

## Next 1 week

- **Cross-venue hedges (Kalshi + Polymarket).** AOMI already ships a typed
  `kalshi` plugin. The analytics layer would extend `find_hedge` to bucket
  by Kalshi event title + Polymarket question, run the same logical-implication
  extraction, and emit a 2-leg or 3-leg plan that spans venues. The widget
  doesn't change; `polymarket.place_order` is replaced with whichever
  plugin owns each leg.

- **Monitor mode.** Agent watches open hedge legs and pings the user when
  one resolves or when the implied probability of the implication shifts
  by >X bps. AOMI's session model already supports long-running threads.

- **Move analytics to typed Rust plugin.** `rust-plugin/` is the migration
  target — see `rust-plugin/README.md`. The TS layer becomes obsolete once
  this compiles against `aomi-sdk` upstream.

## Next 1 month

- **Backtest engine.** Pull historical CLOB snapshots (chainstacklabs has
  methodology), replay the hedge detector against each, score precision
  and realized return. This is what turns "found a hedge in 38 seconds"
  into "found N hedges over Q1 2026 with mean realized return X%."

- **Wallet-integration kit.** A `<AomiFrame/>` reference build that any
  wallet team can fork to drop a copilot into their dashboard in a day.
  This is the productized version of the moat-mapping table in the README.

- **Improved correlation extractor.** Two-pass: first pass GPT-4o-mini for
  cheap filtering, second pass GPT-4o for high-confidence pairs only.
  Cuts cost ~10x without losing accuracy.

## Anti-roadmap

Things we won't ship:
- Custom widget UI (the moat *is* `<AomiFrame/>`).
- Multi-tenant multi-user mode (each user gets their own agent — out of
  scope for the trader persona).
- Solana / non-EVM chains.
- Token / fee model. Free for everyone forever; AOMI monetizes the runtime.
