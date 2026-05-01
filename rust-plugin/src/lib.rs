//! aomi-hedge-sniper — typed AOMI plugin (stub).
//!
//! This crate compiles in two modes:
//!
//! - default (no features): a plain Rust crate with the type definitions
//!   mirrored from `apps/web/lib/types.ts`. `cargo check` works in any
//!   environment and validates the type port.
//!
//! - `--features plugin`: wires the types into `aomi-sdk` via the
//!   `dyn_aomi_app!` macro. Requires a local `aomi-sdk` crate. See README.

pub mod tool;
pub mod types;

#[cfg(feature = "plugin")]
mod plugin {
    use super::*;
    use aomi_sdk::*;

    // Mirrors `apps/polymarket/src/lib.rs` from the AOMI SDK.
    // The PREAMBLE string is what the LLM sees as plugin documentation.
    static PREAMBLE: std::sync::LazyLock<String> = std::sync::LazyLock::new(|| {
        "Hedge Sniper finds positive-EV covering portfolios on Polymarket.\n\
         Use `find_hedge` with a max_collateral_usdc and min_return_bps; the\n\
         tool returns a HedgePlan with two legs the agent can place via the\n\
         polymarket plugin's order tools. The implication is LLM-extracted\n\
         and confidence is exposed in HedgePlan.rationale — surface it."
            .to_string()
    });

    pub(crate) struct HedgeSniperApp;

    dyn_aomi_app!(
        app = HedgeSniperApp,
        name = "hedge-sniper",
        version = "0.1.0",
        preamble = PREAMBLE.as_str(),
        tools = [tool::FindHedge],
        namespaces = ["common"]
    );
}
