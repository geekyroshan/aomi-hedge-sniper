# Example: review-then-place flow

```
> show me the safest covering portfolio under $25

Scanning… returning the highest-confidence pair that fits your budget.

Found: +4.12% expected return @ 84% confidence.

  Leg 1 — buy YES @ 0.41 × 25 shares = 10.25 USDC
    "Will the Fed cut rates in December 2026?"
  Leg 2 — buy NO @ 0.55 × 25 shares = 13.75 USDC
    "Will the Fed hold rates flat through Q1 2027?"

  total collateral: 24.00 USDC
  expected payout under implication: 25.00 USDC

  Implication: a December rate cut is logically inconsistent with holding
  flat through Q1 2027 (one month overlap).

> what's the worst case?

Worst case: both legs miss. The Fed neither cuts in December nor holds
through Q1 — i.e. the Fed cuts AFTER December (raising probability M1 = NO
and M2 = NO). In that path you lose the full 24.00 USDC.

> ok place it

Routing to AOMI polymarket plugin… preparing typed order calls.
Wallet signature requested — bundling approve + buy + buy via Para 4337.
✓ Signed. Bundle confirmed: 0x9f8e…7a2c
Position open. Tracked under thread "fed-q4-2026-hedge".
```
