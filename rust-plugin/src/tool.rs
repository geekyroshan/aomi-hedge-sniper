//! `find_hedge` — typed tool signature.
//!
//! In the TS implementation (apps/web/app/api/hedge/route.ts) this is a
//! POST endpoint. In the Rust plugin it's a `DynAomiTool` whose Args type
//! is compile-time validated by AOMI's runtime — the LLM literally cannot
//! emit a malformed call.

use crate::types::{FindHedgeArgs, HedgePlan};

/// The tool. Body is intentionally a TODO — see README.md for the migration
/// plan. The `cfg(feature = "plugin")` block adds the aomi-sdk wiring.
pub struct FindHedge;

#[cfg(feature = "plugin")]
mod plugin_impl {
    use super::*;
    use aomi_sdk::schemars::JsonSchema;
    use aomi_sdk::*;
    use serde_json::{json, Value};

    // Re-derive JsonSchema for the Args under the `plugin` feature so the
    // SDK macros can materialize the tool schema for the LLM.
    #[derive(Debug, serde::Deserialize, JsonSchema)]
    pub struct FindHedgeArgsSchema {
        /// Max USDC of collateral the user will put up across both legs.
        pub max_collateral_usdc: f64,
        /// Minimum acceptable return in basis points (e.g. 300 = 3%).
        pub min_return_bps: u32,
    }

    // NOTE: Wiring stub. The real implementation will mirror the TS pipeline:
    //   1. fetch_active_markets() via reqwest
    //   2. enrich_with_order_book()
    //   3. build_candidate_pairs()
    //   4. extract_implications() (OpenAI)
    //   5. build_plan() per pair
    //   6. pick_best()
    //
    // Until then, returning a structured TODO error is more honest than
    // silently returning seed data through a "production" tool.
    impl DynAomiTool for FindHedge {
        type App = crate::plugin::HedgeSniperApp;
        type Args = FindHedgeArgsSchema;
        const NAME: &'static str = "find_hedge";
        const DESCRIPTION: &'static str = concat!(
            "Find a positive-EV covering portfolio on Polymarket. ",
            "Returns a HedgePlan with two legs whose union is forced to ",
            "resolve true under an LLM-extracted logical implication. ",
            "The agent should present the plan to the user, get explicit ",
            "approval, and only then call the polymarket plugin's order tools."
        );

        fn run(
            _app: &crate::plugin::HedgeSniperApp,
            _args: Self::Args,
            _ctx: DynToolCallCtx,
        ) -> Result<Value, String> {
            Err("find_hedge: not yet implemented in the Rust plugin. The working analytics live in apps/web/app/api/hedge/route.ts. See rust-plugin/README.md for the migration plan.".to_string())
        }
    }
}

/// Plain-Rust signature, callable without the SDK feature. Used as a sanity
/// type-check that the FindHedgeArgs/HedgePlan shapes still line up.
#[allow(dead_code)]
pub fn find_hedge_signature(_args: FindHedgeArgs) -> Result<HedgePlan, String> {
    Err("stub — see rust-plugin/README.md".to_string())
}
