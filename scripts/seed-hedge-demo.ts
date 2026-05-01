#!/usr/bin/env tsx
/**
 * seed-hedge-demo.ts — emit a hand-crafted realistic HedgePlan.
 *
 * Used when the live Polymarket scan returns nothing inside the user's
 * thresholds (e.g. during the demo recording). Mirrors the same shape that
 * /api/hedge returns so the UI doesn't need to special-case it.
 *
 * Usage:
 *   pnpm seed                # prints the seed plan as JSON to stdout
 *   pnpm seed | jq '.legs'   # pipe-friendly
 */

import { randomUUID } from "node:crypto";

const leg1Price = 0.32;
const leg2Price = 0.62;
const shares = 50;

const plan = {
  id: randomUUID(),
  legs: [
    {
      marketId: "seed-m1",
      marketSlug: "trump-2028-republican-primary-winner",
      marketQuestion: "Will Donald Trump win the 2028 Republican presidential primary?",
      side: "YES" as const,
      tokenId: "seed-token-yes-m1",
      shares,
      maxPrice: leg1Price,
      costUsdc: round2(shares * leg1Price),
    },
    {
      marketId: "seed-m2",
      marketSlug: "trump-2028-general-election-winner",
      marketQuestion: "Will Donald Trump win the 2028 US general election?",
      side: "NO" as const,
      tokenId: "seed-token-no-m2",
      shares,
      maxPrice: leg2Price,
      costUsdc: round2(shares * leg2Price),
    },
  ],
  totalCollateralUsdc: round2(shares * (leg1Price + leg2Price)),
  expectedPayoutUsdc: shares,
  expectedReturnBps: Math.round(((1 - (leg1Price + leg2Price)) / (leg1Price + leg2Price)) * 10_000),
  worstCasePayoutUsdc: 0,
  worstCaseReturnBps: -10_000,
  rationale: {
    implication: "M1=YES (Trump wins primary) — under historical base rates, M2=NO covers ~50% of paths.",
    llmReasoning:
      "If Trump wins the 2028 GOP primary, he is the nominee, but winning the general is uncertain. The combined position is positive-EV under historical base rates that primary winners win the general only ~50%.",
    llmConfidence: 0.78,
    honestyDisclaimer:
      "This is positive-EV under the LLM-extracted implication, NOT risk-free arbitrage. Demo seed.",
  },
  liveness: {
    timestamp: new Date().toISOString(),
    leg1DepthUsd: 8_400,
    leg2DepthUsd: 12_100,
    estimatedSlippageBps: 75,
  },
  isSeeded: true,
};

console.log(JSON.stringify(plan, null, 2));

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
