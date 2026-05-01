/**
 * Hedge Sniper — shared types.
 *
 * Used by /api/hedge, the agent system prompt, and the UI rendering layer.
 * Mirrored 1:1 in `rust-plugin/src/types.rs` so the production migration is a
 * compile-error-driven port, not a redesign.
 */

/** Polymarket CLOB market metadata, pruned to what the hedge math needs. */
export type Market = {
  /** Polymarket market id (UUID-ish). */
  id: string;
  /** URL slug — used to deep-link the user to polymarket.com for verification. */
  slug: string;
  /** Human-readable question, e.g. "Will Trump win the 2028 Republican primary?" */
  question: string;
  /** Free-text tag list from Polymarket — used to bucket markets before the LLM call. */
  tags: string[];
  /** Outcome labels, always ["Yes", "No"] for binary markets — we only support binary. */
  outcomes: [string, string];
  /** Best ask price for YES, in USDC per share (0–1). null if order book empty. */
  yesAsk: number | null;
  /** Best ask price for NO, in USDC per share (0–1). */
  noAsk: number | null;
  /** Total USD depth at best ask for YES — limits how much we can fill at the quoted price. */
  yesDepthUsd: number;
  /** Total USD depth at best ask for NO. */
  noDepthUsd: number;
  /** 24h trading volume in USDC. Universe filter drops markets below threshold. */
  volume24hUsd: number;
  /** Resolution time, ISO-8601. We drop markets resolving in <7 days or >30 days. */
  endDate: string;
  /** Token id for the YES outcome — what `polymarket.place_order` needs. */
  yesTokenId: string;
  /** Token id for the NO outcome. */
  noTokenId: string;
};

/** Logical implication extracted by the LLM. */
export type Implication = {
  /** "if M1 = YES, then M2 = ___" */
  m1YesImplies: "M2_yes" | "M2_no" | "independent";
  /** Confidence in the implication, 0–1. We keep only ≥ 0.7. */
  confidence: number;
  /** The LLM's verbatim one-sentence reasoning. Surfaced to the user for honesty. */
  reasoning: string;
};

/** A single trade leg the agent will instruct AOMI's polymarket plugin to place. */
export type Leg = {
  marketId: string;
  marketSlug: string;
  marketQuestion: string;
  /** Which outcome we're buying. */
  side: "YES" | "NO";
  /** Token id passed to `polymarket.place_order`. */
  tokenId: string;
  /** Number of shares. Each share pays out 1 USDC if the outcome resolves true. */
  shares: number;
  /** Limit price (USDC per share). The order must fill at or below this. */
  maxPrice: number;
  /** Total cost = shares × maxPrice. */
  costUsdc: number;
};

/** A complete covering-portfolio plan the agent presents to the user. */
export type HedgePlan = {
  /** Stable id used by `simulate_plan(plan_id)` and the UI. */
  id: string;
  legs: [Leg, Leg];
  /** Sum of leg costs. */
  totalCollateralUsdc: number;
  /** Best-case payout (USDC) under the LLM-extracted implication. */
  expectedPayoutUsdc: number;
  /** Return in basis points, computed under the implication. */
  expectedReturnBps: number;
  /** Worst-case payout if the implication fails (i.e. both legs lose). */
  worstCasePayoutUsdc: number;
  /** Worst-case return in basis points. Will be negative for any real hedge. */
  worstCaseReturnBps: number;
  /** Verbatim implication reasoning + LLM confidence. Honest disclosure. */
  rationale: {
    implication: string;
    llmReasoning: string;
    llmConfidence: number;
    /** "this is positive-EV under the stated implication, NOT risk-free arbitrage" */
    honestyDisclaimer: string;
  };
  /** Live order book health at the moment of plan generation. */
  liveness: {
    timestamp: string;
    leg1DepthUsd: number;
    leg2DepthUsd: number;
    estimatedSlippageBps: number;
  };
  /** True when the plan was synthesized from `scripts/seed-hedge-demo.ts` rather than live CLOB. */
  isSeeded: boolean;
};

/** POST /api/hedge request body. */
export type HedgeRequest = {
  maxCollateralUsdc: number;
  minReturnBps: number;
};

/** POST /api/hedge response body. */
export type HedgeResponse =
  | { ok: true; plan: HedgePlan }
  | { ok: false; reason: string; suggestion?: string };
