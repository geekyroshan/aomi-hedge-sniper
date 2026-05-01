# Example: find a 3%+ hedge under $50 collateral

```
> find me a guaranteed 3%+ hedge under $50 please

Scanning 487 active Polymarket markets… filtering by liquidity, depth, and
resolution window (7–30 days)…

Found a covering portfolio: +5.91% expected return @ 78% confidence on the
implication.

  Leg 1 — buy YES @ 0.32 USDC × 50 shares = 16.00 USDC
    "Will Donald Trump win the 2028 Republican presidential primary?"
  Leg 2 — buy NO @ 0.62 USDC × 50 shares = 31.00 USDC
    "Will Donald Trump win the 2028 US general election?"

  total collateral: 47.00 USDC
  payout under implication: 50.00 USDC
  worst case (both legs miss): 0.00 USDC

  Implication: M1=YES (Trump wins primary) — under historical base rates,
  M2=NO covers ~50% of paths.

  Honesty disclaimer: this is positive-EV under the LLM-extracted
  implication, NOT risk-free arbitrage. If both events resolve against the
  implication (Trump wins primary AND general), the NO-general leg loses
  fully.

> looks good — simulate

Calling AOMI batch-simulate-before-sign on the forked Polygon chain…
  ✓ approve(USDC, 47.00)
  ✓ buy YES (leg 1) — 50 shares @ 0.32
  ✓ buy NO (leg 2) — 50 shares @ 0.62
All three steps green; net cost = 47.00 USDC.

> sign

Bundling both legs via Para 4337 → one signature for two orders.
Bundle 0xa1b2…d3e4 confirmed on Polygon. Both legs filled.
```
