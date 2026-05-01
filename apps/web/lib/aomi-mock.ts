/**
 * AOMI runtime mock — used when AOMI_API_KEY is not set.
 *
 * The real demo flow:
 *   user types  →  AOMI runtime (https://aomi.dev) routes to LLM
 *               →  LLM calls `find_hedge` (our /api/hedge route)
 *               →  LLM calls polymarket plugin tools to place legs
 *               →  Para AA bundles both legs into ONE signature
 *
 * In mock mode we short-circuit the runtime: the page calls /api/hedge
 * directly via the browser, renders the plan, and surfaces a clearly
 * labelled "MOCK MODE — order placement disabled" banner.
 *
 * To flip to real mode:
 *   1. Set AOMI_API_KEY in .env.local
 *   2. Restart `pnpm dev`
 * That's it. The same UI surface picks up the real runtime via
 * `<AomiRuntimeProvider/>` in `components/HedgeFrame.tsx`.
 */

export type AomiMode = "real" | "mock";

export function getAomiMode(): AomiMode {
  // NEXT_PUBLIC_MOCK_MODE is set by next.config.mjs based on AOMI_API_KEY.
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_MOCK_MODE === "1" ? "mock" : "real";
  }
  // Server side: trust the env directly.
  if (process.env.AOMI_FORCE_MOCK === "1") return "mock";
  return process.env.AOMI_API_KEY ? "real" : "mock";
}

/** Human-readable banner shown in the UI when in mock mode. */
export const MOCK_MODE_BANNER =
  "Running in MOCK MODE — set AOMI_API_KEY in .env.local to enable on-chain order placement through AOMI's typed Polymarket plugin and Para AA bundler.";
