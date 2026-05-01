/**
 * Polymarket CLOB + Gamma API client.
 *
 * Ported from Roshan's live Polymarket bot at ~/clawd/polymarket-bot/bot.py.
 * The bot uses the Python `py_clob_client` SDK; here we hit the public REST
 * endpoints directly so we don't pull in heavyweight deps for what is mostly
 * read-only data fetching.
 *
 * Endpoints:
 *   - Gamma:  https://gamma-api.polymarket.com  (market metadata, search)
 *   - CLOB:   https://clob.polymarket.com       (order books, prices)
 *
 * The agent's actual order placement happens through AOMI's typed Rust
 * `polymarket` plugin — we never sign here.
 */

import type { Market } from "./types";

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

type GammaMarket = {
  id: string;
  slug: string;
  question: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  outcomes: string; // JSON-stringified array
  outcomePrices: string; // JSON-stringified array
  clobTokenIds: string; // JSON-stringified array
  volume24hr?: number;
  volumeNum?: number;
  liquidityNum?: number;
  tags?: Array<{ label: string; slug: string }> | string[];
  endDate?: string;
};

/**
 * Pull live, active, binary markets from Polymarket Gamma.
 *
 * Returns at most `limit` markets, filtered for the universe rules from
 * SPEC §6 step 1: active, ≥$5k 24h volume, 7–30 days to resolution.
 */
export async function fetchActiveMarkets(opts: {
  limit?: number;
  signal?: AbortSignal;
}): Promise<Market[]> {
  const limit = opts.limit ?? 200;
  const url = new URL(`${GAMMA}/markets`);
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("archived", "false");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("order", "volume24hr");
  url.searchParams.set("ascending", "false");

  const res = await fetch(url, {
    method: "GET",
    headers: { "User-Agent": "hedge-sniper/0.1 (https://github.com/geekyroshan/hedge-sniper)" },
    signal: opts.signal,
    // Cache the markets list for 60s — we don't need millisecond freshness for
    // candidate scanning; the order-book pull (which IS time-sensitive)
    // happens in `enrichWithOrderBook` and is uncached.
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Polymarket Gamma /markets failed: ${res.status} ${res.statusText}`);
  }

  const raw = (await res.json()) as GammaMarket[];
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 3600 * 1000;
  const thirtyDaysMs = 30 * 24 * 3600 * 1000;

  const markets: Market[] = [];
  for (const m of raw) {
    if (!m.active || m.closed || m.archived) continue;
    if (!m.endDate) continue;
    const endMs = Date.parse(m.endDate);
    if (Number.isNaN(endMs)) continue;
    const dt = endMs - now;
    if (dt < sevenDaysMs || dt > thirtyDaysMs) continue;

    const vol = m.volume24hr ?? m.volumeNum ?? 0;
    if (vol < 5_000) continue;

    let outcomes: string[];
    let tokenIds: string[];
    try {
      outcomes = JSON.parse(m.outcomes);
      tokenIds = JSON.parse(m.clobTokenIds);
    } catch {
      continue;
    }
    if (outcomes.length !== 2 || tokenIds.length !== 2) continue;

    const tags: string[] = Array.isArray(m.tags)
      ? m.tags.map((t) => (typeof t === "string" ? t : t.label))
      : [];

    markets.push({
      id: m.id,
      slug: m.slug,
      question: m.question,
      tags,
      outcomes: [outcomes[0]!, outcomes[1]!],
      yesAsk: null, // populated by enrichWithOrderBook
      noAsk: null,
      yesDepthUsd: 0,
      noDepthUsd: 0,
      volume24hUsd: vol,
      endDate: m.endDate,
      yesTokenId: tokenIds[0]!,
      noTokenId: tokenIds[1]!,
    });
  }

  return markets;
}

type OrderBook = {
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
};

/**
 * Pull best-ask + cumulative depth for the YES and NO tokens of a single
 * market, mutating the input. We compute "depth at the best ask price" in
 * USDC because that's the only number that matters for sizing the hedge.
 */
async function pullBook(tokenId: string, signal?: AbortSignal): Promise<{ ask: number | null; depthUsd: number }> {
  const url = `${CLOB}/book?token_id=${encodeURIComponent(tokenId)}`;
  const res = await fetch(url, { signal, headers: { "User-Agent": "hedge-sniper/0.1" } });
  if (!res.ok) return { ask: null, depthUsd: 0 };

  const book = (await res.json()) as OrderBook;
  if (!book.asks || book.asks.length === 0) return { ask: null, depthUsd: 0 };

  // Sort asks ascending by price (CLOB returns them but we don't trust order).
  const asks = [...book.asks].sort((a, b) => Number(a.price) - Number(b.price));
  const bestAsk = Number(asks[0]!.price);
  if (!Number.isFinite(bestAsk) || bestAsk <= 0 || bestAsk >= 1) {
    return { ask: null, depthUsd: 0 };
  }

  // Aggregate USDC depth available at or near the best ask (within 50 bps).
  const ceiling = bestAsk * 1.005;
  let depthUsd = 0;
  for (const a of asks) {
    const p = Number(a.price);
    const sz = Number(a.size);
    if (p > ceiling) break;
    depthUsd += p * sz;
  }
  return { ask: bestAsk, depthUsd };
}

/**
 * Enrich markets with live order book data. Filters out any market that
 * lacks ≥$100 depth on either side at the best ask (SPEC §6 step 1).
 */
export async function enrichWithOrderBook(
  markets: Market[],
  opts: { signal?: AbortSignal; minDepthUsd?: number; concurrency?: number } = {},
): Promise<Market[]> {
  const minDepth = opts.minDepthUsd ?? 100;
  const concurrency = opts.concurrency ?? 6;

  const enriched: Market[] = [];
  // Simple bounded-concurrency loop — no need for p-map.
  for (let i = 0; i < markets.length; i += concurrency) {
    const batch = markets.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (m) => {
        const [yesBook, noBook] = await Promise.all([
          pullBook(m.yesTokenId, opts.signal),
          pullBook(m.noTokenId, opts.signal),
        ]);
        return { m, yesBook, noBook };
      }),
    );
    for (const { m, yesBook, noBook } of results) {
      if (yesBook.ask === null || noBook.ask === null) continue;
      if (yesBook.depthUsd < minDepth || noBook.depthUsd < minDepth) continue;
      enriched.push({
        ...m,
        yesAsk: yesBook.ask,
        noAsk: noBook.ask,
        yesDepthUsd: yesBook.depthUsd,
        noDepthUsd: noBook.depthUsd,
      });
    }
  }
  return enriched;
}
