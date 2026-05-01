/**
 * Hand-crafted realistic hedge plan, used as a fallback when the live
 * Polymarket scan returns nothing within the user's thresholds. Documented
 * in the README as "seed mode"; flagged in the response with isSeeded=true.
 *
 * The numbers are illustrative but plausible — they reflect a typical
 * primary-implies-not-general structure that has historically appeared on
 * Polymarket around US election cycles.
 */

import { randomUUID } from "node:crypto";
import type { HedgePlan } from "./types";

export function seedHedgeDemo(budgetUsdc: number): HedgePlan {
  const leg1Price = 0.32;
  const leg2Price = 0.62;
  const costPerPairShare = leg1Price + leg2Price; // 0.94
  const maxShares = Math.max(1, Math.floor(budgetUsdc / costPerPairShare));
  const shares = Math.min(maxShares, 50); // cap demo size

  const leg1Cost = round2(shares * leg1Price);
  const leg2Cost = round2(shares * leg2Price);
  const total = round2(leg1Cost + leg2Cost);

  const expectedReturnBps = Math.round(((1 - costPerPairShare) / costPerPairShare) * 10_000);

  return {
    id: randomUUID(),
    legs: [
      {
        marketId: "seed-m1",
        marketSlug: "trump-2028-republican-primary-winner",
        marketQuestion: "Will Donald Trump win the 2028 Republican presidential primary?",
        side: "YES",
        tokenId: "seed-token-yes-m1",
        shares,
        maxPrice: leg1Price,
        costUsdc: leg1Cost,
      },
      {
        marketId: "seed-m2",
        marketSlug: "trump-2028-general-election-winner",
        marketQuestion: "Will Donald Trump win the 2028 US general election?",
        side: "NO",
        tokenId: "seed-token-no-m2",
        shares,
        maxPrice: leg2Price,
        costUsdc: leg2Cost,
      },
    ],
    totalCollateralUsdc: total,
    expectedPayoutUsdc: shares,
    expectedReturnBps,
    worstCasePayoutUsdc: 0,
    worstCaseReturnBps: -10_000,
    rationale: {
      implication:
        "M1=YES (Trump wins primary) implies M2=NO is *not* logically forced — but historically the NO leg covers most realized paths where M1=NO.",
      llmReasoning:
        "If Trump wins the 2028 Republican primary, he is by definition the GOP nominee, but winning the general is uncertain. The combined position (YES primary + NO general) is positive-EV under historical base rates that primary winners win the general only ~50%.",
      llmConfidence: 0.78,
      honestyDisclaimer:
        "This is a positive-EV covering portfolio UNDER the LLM-extracted implication (and historical base rates), not risk-free arbitrage. If both events resolve against the implication (Trump wins primary AND general), the NO-general leg loses fully. Demo seed — not live order book.",
    },
    liveness: {
      timestamp: new Date().toISOString(),
      leg1DepthUsd: 8_400,
      leg2DepthUsd: 12_100,
      estimatedSlippageBps: 75,
    },
    isSeeded: true,
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
