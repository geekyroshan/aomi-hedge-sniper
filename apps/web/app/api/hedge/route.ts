/**
 * POST /api/hedge — the analytics tool the AOMI agent calls.
 *
 * Contract:
 *   Body:   { maxCollateralUsdc: number, minReturnBps: number }
 *   200:    { ok: true, plan: HedgePlan }
 *   200:    { ok: false, reason: string }       (no plan met thresholds; honest)
 *   400:    invalid input
 *   500:    upstream/runtime error
 *
 * Implementation per SPEC §6:
 *   1. Pull universe of active Polymarket markets (Gamma)
 *   2. Filter for volume + resolution time + depth (CLOB)
 *   3. Bucket by tag, build candidate pairs
 *   4. LLM extracts logical implications, drops confidence < 0.7
 *   5. Build covering portfolio per pair, filter by user thresholds
 *   6. Rank, return top 1
 *
 * If the live scan produces no plan AND the request includes header
 * `x-allow-seed: 1`, we fall back to `scripts/seed-hedge-demo.ts`. This is
 * the demo-recording escape hatch — documented in README.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchActiveMarkets, enrichWithOrderBook } from "@/lib/polymarket";
import { buildCandidatePairs, extractImplications } from "@/lib/correlation";
import { buildPlan, pickBest } from "@/lib/covering-portfolio";
import { seedHedgeDemo } from "@/lib/seed";
import type { HedgeRequest, HedgeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  maxCollateralUsdc: z.number().positive().max(10_000),
  minReturnBps: z.number().int().min(0).max(50_000),
});

export async function POST(req: Request): Promise<NextResponse<HedgeResponse>> {
  let body: HedgeRequest;
  try {
    const json = await req.json();
    const parsed = RequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, reason: `Invalid request: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: `Could not parse request body: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  const allowSeed = req.headers.get("x-allow-seed") === "1";
  const openaiKey = process.env.OPENAI_API_KEY;

  // If we have no OpenAI key, we can't run the real correlation step.
  // Be honest about it; suggest the seed fallback for demo purposes.
  if (!openaiKey) {
    if (allowSeed) {
      const plan = seedHedgeDemo(body.maxCollateralUsdc);
      return NextResponse.json({ ok: true, plan });
    }
    return NextResponse.json(
      {
        ok: false,
        reason: "OPENAI_API_KEY not set — cannot run correlation extraction.",
        suggestion: "Set OPENAI_API_KEY in .env.local, OR pass header x-allow-seed: 1 for the demo seed.",
      },
      { status: 500 },
    );
  }

  try {
    // Step 1+2: universe pull, depth filter
    const universe = await fetchActiveMarkets({ limit: 200 });
    const enriched = await enrichWithOrderBook(universe.slice(0, 60), { minDepthUsd: 100 });

    if (enriched.length < 4) {
      if (allowSeed) {
        const plan = seedHedgeDemo(body.maxCollateralUsdc);
        return NextResponse.json({ ok: true, plan });
      }
      return NextResponse.json(
        {
          ok: false,
          reason: `Only ${enriched.length} markets passed liquidity filters; not enough to form pairs.`,
          suggestion: "Try again later, or pass header x-allow-seed: 1 for the demo seed.",
        },
        { status: 200 },
      );
    }

    // Step 3+4: pair, extract implications
    const pairs = buildCandidatePairs(enriched, 60);
    const withImplications = await extractImplications(pairs, { apiKey: openaiKey, concurrency: 4 });

    // Step 5: build plans
    const plans = withImplications
      .map((p) => {
        const plan = buildPlan(p, body);
        return plan ? { plan, confidence: p.implication.confidence } : null;
      })
      .filter((x): x is { plan: ReturnType<typeof buildPlan> & object; confidence: number } => x !== null);

    // Step 6: rank
    const best = pickBest(plans);
    if (!best) {
      if (allowSeed) {
        const plan = seedHedgeDemo(body.maxCollateralUsdc);
        return NextResponse.json({ ok: true, plan });
      }
      return NextResponse.json(
        {
          ok: false,
          reason: `No covering portfolio met your thresholds (max ${body.maxCollateralUsdc} USDC, min ${body.minReturnBps} bps).`,
          suggestion:
            "Try lowering minReturnBps, raising maxCollateralUsdc, or pass header x-allow-seed: 1 for the demo seed.",
        },
        { status: 200 },
      );
    }
    return NextResponse.json({ ok: true, plan: best });
  } catch (e) {
    // Minimal observability — surfaces in `vercel logs` / dev terminal for
    // debugging when the scan fails. Production would route this through
    // an error tracker (Sentry, Vercel Observability, etc).
    console.error("[/api/hedge] scan failed", {
      message: (e as Error).message,
      stack: (e as Error).stack,
      maxCollateralUsdc: body.maxCollateralUsdc,
      minReturnBps: body.minReturnBps,
    });
    return NextResponse.json(
      { ok: false, reason: `Scan failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
