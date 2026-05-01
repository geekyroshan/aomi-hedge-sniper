//! Mirror of `apps/web/lib/types.ts` — field-for-field identical so the TS
//! and Rust shapes serialize to the same JSON. This is the "compile-time
//! contract" between the working TS demo and the production Rust port.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Leg {
    pub market_id: String,
    pub market_slug: String,
    pub market_question: String,
    pub side: Side,
    pub token_id: String,
    pub shares: u64,
    pub max_price: f64,
    pub cost_usdc: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Side {
    #[serde(rename = "YES")]
    Yes,
    #[serde(rename = "NO")]
    No,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rationale {
    pub implication: String,
    pub llm_reasoning: String,
    pub llm_confidence: f64,
    pub honesty_disclaimer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Liveness {
    pub timestamp: String,
    pub leg1_depth_usd: f64,
    pub leg2_depth_usd: f64,
    pub estimated_slippage_bps: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HedgePlan {
    pub id: String,
    pub legs: [Leg; 2],
    pub total_collateral_usdc: f64,
    pub expected_payout_usdc: f64,
    pub expected_return_bps: i64,
    pub worst_case_payout_usdc: f64,
    pub worst_case_return_bps: i64,
    pub rationale: Rationale,
    pub liveness: Liveness,
    pub is_seeded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindHedgeArgs {
    /// Max USDC the user is willing to put up as collateral across both legs.
    pub max_collateral_usdc: f64,
    /// Minimum acceptable return in basis points (e.g. 300 = 3%).
    pub min_return_bps: u32,
}
