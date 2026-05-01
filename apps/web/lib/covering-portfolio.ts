/**
 * Covering-portfolio math. Per SPEC §6 steps 3–5.
 *
 * We never claim "risk-free arbitrage" — these are LLM-extracted-implication
 * hedges with positive expected value UNDER the implication. The honesty
 * disclaimer is materialized into every HedgePlan.rationale.
 */

import { randomUUID } from "node:crypto";
import type { CandidatePair } from "./correlation";
import type { Implication, HedgePlan, Leg } from "./types";

/**
 * Given a market pair + LLM implication + a budget, build a covering portfolio.
 *
 * If `M1=YES implies M2=NO`: buy YES on M1 + buy NO on M2.
 *   Under the implication, exactly one leg always wins → guaranteed 1 USDC payout.
 *   Without the implication, both could lose (worst case = -100% on the pair).
 *
 * If `M1=YES implies M2=YES`: buy NO on M1 + buy YES on M2 (symmetric).
 *
 * Returns null if the math doesn't clear the user's thresholds.
 */
export function buildPlan(
  pair: CandidatePair & { implication: Implication },
  opts: { maxCollateralUsdc: number; minReturnBps: number },
): HedgePlan | null {
  const { m1, m2, implication } = pair;
  if (m1.yesAsk === null || m1.noAsk === null) return null;
  if (m2.yesAsk === null || m2.noAsk === null) return null;

  // Pick the two legs whose union is forced to resolve true under the
  // implication. The leg-side selection IS the hedge.
  let leg1Side: "YES" | "NO";
  let leg2Side: "YES" | "NO";
  if (implication.m1YesImplies === "M2_no") {
    // M1=YES → M2=NO. Hedge: M1=YES OR M2=NO must be true (since if M1=NO,
    // any value of M2 still leaves M2=NO as a 50% chance — see disclaimer).
    leg1Side = "YES";
    leg2Side = "NO";
  } else if (implication.m1YesImplies === "M2_yes") {
    leg1Side = "NO";
    leg2Side = "YES";
  } else {
    return null;
  }

  const leg1Price = leg1Side === "YES" ? m1.yesAsk : m1.noAsk;
  const leg2Price = leg2Side === "YES" ? m2.yesAsk : m2.noAsk;
  const leg1Token = leg1Side === "YES" ? m1.yesTokenId : m1.noTokenId;
  const leg2Token = leg2Side === "YES" ? m2.yesTokenId : m2.noTokenId;
  const leg1Depth = leg1Side === "YES" ? m1.yesDepthUsd : m1.noDepthUsd;
  const leg2Depth = leg2Side === "YES" ? m2.yesDepthUsd : m2.noDepthUsd;

  // Cost per share of the pair = leg1 + leg2 prices. Each share pays out
  // 1 USDC if the union resolves true (i.e. the implication holds).
  const costPerPairShare = leg1Price + leg2Price;
  if (costPerPairShare >= 1) return null; // not positive-EV under implication
  if (costPerPairShare <= 0) return null;

  const expectedReturnBps = Math.round(((1 - costPerPairShare) / costPerPairShare) * 10_000);
  if (expectedReturnBps < opts.minReturnBps) return null;

  // Size. Limited by:
  //   - user's max collateral in USDC
  //   - depth on each leg at the quoted price
  const maxSharesByBudget = Math.floor(opts.maxCollateralUsdc / costPerPairShare);
  const maxSharesByLeg1 = Math.floor(leg1Depth / leg1Price);
  const maxSharesByLeg2 = Math.floor(leg2Depth / leg2Price);
  const shares = Math.max(0, Math.min(maxSharesByBudget, maxSharesByLeg1, maxSharesByLeg2));
  if (shares < 1) return null;

  const leg1: Leg = {
    marketId: m1.id,
    marketSlug: m1.slug,
    marketQuestion: m1.question,
    side: leg1Side,
    tokenId: leg1Token,
    shares,
    maxPrice: leg1Price,
    costUsdc: round2(shares * leg1Price),
  };
  const leg2: Leg = {
    marketId: m2.id,
    marketSlug: m2.slug,
    marketQuestion: m2.question,
    side: leg2Side,
    tokenId: leg2Token,
    shares,
    maxPrice: leg2Price,
    costUsdc: round2(shares * leg2Price),
  };

  const totalCollateral = round2(leg1.costUsdc + leg2.costUsdc);
  const expectedPayout = shares; // 1 USDC × shares, under the implication
  const worstCasePayout = 0; // both legs miss
  const worstCaseReturnBps = Math.round(((worstCasePayout - totalCollateral) / totalCollateral) * 10_000);

  // Slippage estimate: how much higher than the best ask we'd pay if we
  // had to walk down the book. Conservatively, assume 50 bps per leg.
  const estimatedSlippageBps = 100;

  const implicationSentence =
    implication.m1YesImplies === "M2_no"
      ? `M1=YES implies M2=NO (confidence ${(implication.confidence * 100).toFixed(0)}%).`
      : `M1=YES implies M2=YES (confidence ${(implication.confidence * 100).toFixed(0)}%).`;

  return {
    id: randomUUID(),
    legs: [leg1, leg2],
    totalCollateralUsdc: totalCollateral,
    expectedPayoutUsdc: expectedPayout,
    expectedReturnBps,
    worstCasePayoutUsdc: worstCasePayout,
    worstCaseReturnBps,
    rationale: {
      implication: implicationSentence,
      llmReasoning: implication.reasoning,
      llmConfidence: implication.confidence,
      honestyDisclaimer:
        "This is a positive-EV covering portfolio UNDER the LLM-extracted implication, not risk-free arbitrage. If the implication fails (probability ≤ 1 − confidence), both legs may lose and you forfeit the full collateral.",
    },
    liveness: {
      timestamp: new Date().toISOString(),
      leg1DepthUsd: round2(leg1Depth),
      leg2DepthUsd: round2(leg2Depth),
      estimatedSlippageBps,
    },
    isSeeded: false,
  };
}

/**
 * Rank candidates and return the best one.
 * Score = expectedReturnBps × confidence × min(legDepth)/cost
 */
export function pickBest(
  plans: Array<{ plan: HedgePlan; confidence: number }>,
): HedgePlan | null {
  if (plans.length === 0) return null;
  const scored = plans.map(({ plan, confidence }) => {
    const minDepth = Math.min(plan.liveness.leg1DepthUsd, plan.liveness.leg2DepthUsd);
    const score = plan.expectedReturnBps * confidence * (minDepth / Math.max(plan.totalCollateralUsdc, 1));
    return { plan, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]!.plan;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
