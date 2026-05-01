/**
 * LLM logical-implication extraction.
 *
 * Per SPEC §6 step 2: for each candidate market pair, ask GPT-4o-mini whether
 * one market's resolution logically implies the other's. We bucket pairs by
 * shared tag first to keep the LLM call count manageable.
 *
 * Output is strict JSON, validated with zod. If the LLM returns garbage,
 * we drop the pair (never crash the whole scan).
 */

import OpenAI from "openai";
import { z } from "zod";
import type { Market, Implication } from "./types";

const ImplicationSchema = z.object({
  implies: z.enum(["M2_yes", "M2_no", "independent"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(280),
});

const PROMPT_SYSTEM = `You are an analyst examining pairs of binary prediction markets.
Given two market questions M1 and M2, decide whether M1 resolving YES logically
forces M2's resolution. Be strict: only return non-independent if the
implication is near-certain by the meaning of the questions, not by historical
correlation. Reply ONLY with JSON of the form:
  { "implies": "M2_yes" | "M2_no" | "independent",
    "confidence": <0..1>,
    "reasoning": "<one short sentence>" }
Use confidence < 0.7 if you're unsure — those will be filtered out.`;

export type CandidatePair = {
  m1: Market;
  m2: Market;
};

/** Build pairs of markets that share at least one tag. Returns at most `cap` pairs. */
export function buildCandidatePairs(markets: Market[], cap = 60): CandidatePair[] {
  const byTag = new Map<string, Market[]>();
  for (const m of markets) {
    for (const t of m.tags) {
      const key = t.toLowerCase();
      const list = byTag.get(key) ?? [];
      list.push(m);
      byTag.set(key, list);
    }
  }
  const seen = new Set<string>();
  const pairs: CandidatePair[] = [];
  for (const list of byTag.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        const key = a.id < b.id ? `${a.id}::${b.id}` : `${b.id}::${a.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ m1: a, m2: b });
        if (pairs.length >= cap) return pairs;
      }
    }
  }
  return pairs;
}

/**
 * Extract implications for a list of pairs in parallel batches.
 * One LLM call per pair (gpt-4o-mini is cheap enough that batching the prompt
 * isn't worth the parsing complexity for a 2-day demo).
 */
export async function extractImplications(
  pairs: CandidatePair[],
  opts: { apiKey: string; concurrency?: number; signal?: AbortSignal },
): Promise<Array<CandidatePair & { implication: Implication }>> {
  const client = new OpenAI({ apiKey: opts.apiKey });
  const concurrency = opts.concurrency ?? 4;
  const out: Array<CandidatePair & { implication: Implication }> = [];

  for (let i = 0; i < pairs.length; i += concurrency) {
    const batch = pairs.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const resp = await client.chat.completions.create(
            {
              model: "gpt-4o-mini",
              temperature: 0,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: PROMPT_SYSTEM },
                {
                  role: "user",
                  content: `M1: "${p.m1.question}"\nM2: "${p.m2.question}"`,
                },
              ],
            },
            { signal: opts.signal },
          );
          const text = resp.choices[0]?.message?.content ?? "";
          const parsed = ImplicationSchema.safeParse(JSON.parse(text));
          if (!parsed.success) return null;
          if (parsed.data.implies === "independent") return null;
          if (parsed.data.confidence < 0.7) return null;
          const implication: Implication = {
            m1YesImplies: parsed.data.implies,
            confidence: parsed.data.confidence,
            reasoning: parsed.data.reasoning,
          };
          return { ...p, implication };
        } catch {
          return null;
        }
      }),
    );
    for (const r of results) if (r) out.push(r);
  }
  return out;
}
