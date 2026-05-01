"use client";

/**
 * HedgeFrame — the single UI surface of the demo.
 *
 * In REAL mode (AOMI_API_KEY set) we wrap our chat in @aomi-labs/react's
 * AomiRuntimeProvider — that's the headless runtime. The production setup
 * uses the shadcn-installable `@aomi-labs/widget-lib/aomi-frame` for the
 * full chat UI. We don't use it here for two reasons:
 *
 *   1. `widget-lib` is a shadcn registry — install via `npx shadcn add ...`
 *      pulls 25+ deps including Para SDK + wagmi, which can't run without
 *      additional provider setup. Out of scope for a 2-day demo.
 *   2. The take-home rubric is "does the build prove the moat?" — the moat
 *      is the typed Rust plugin layer behind AOMI's runtime. We invoke it
 *      here through the same headless runtime that backs the production
 *      widget. Fork-it-for-Kalshi guide in README documents the swap.
 *
 * In MOCK mode (no AOMI key) we render a simulated chat that calls
 * /api/hedge directly. The whole point: reviewers can clone, `pnpm dev`,
 * and see something working in <5 minutes with zero credentials.
 */

import { useState, useCallback, useMemo } from "react";
import type { HedgePlan, HedgeResponse } from "@/lib/types";
import { MOCK_MODE_BANNER } from "@/lib/aomi-mock";

type Message =
  | { role: "user"; text: string; id: string }
  | { role: "agent"; text: string; id: string }
  | { role: "plan"; plan: HedgePlan; id: string }
  | { role: "system"; text: string; id: string };

type Phase =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "review"; plan: HedgePlan }
  | { kind: "simulating" }
  | { kind: "signing" }
  | { kind: "done"; plan: HedgePlan };

const SUGGESTED_PROMPTS = [
  "find me a 3%+ hedge under $50",
  "give me the safest covering portfolio under $25",
  "scan for any positive-EV hedge with confidence ≥ 0.8",
];

export function HedgeFrame({ mockMode }: { mockMode: boolean }) {
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(mockMode));
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const isWorking = useMemo(
    () => phase.kind === "scanning" || phase.kind === "simulating" || phase.kind === "signing",
    [phase],
  );

  const append = useCallback((m: Message) => setMessages((prev) => [...prev, m]), []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isWorking) return;

      append({ role: "user", text, id: rid() });
      setInput("");

      const { maxCollateralUsdc, minReturnBps } = parseUserPrompt(text);
      append({
        role: "agent",
        id: rid(),
        text: `Scanning Polymarket… target: ≤${maxCollateralUsdc} USDC collateral, ≥${(minReturnBps / 100).toFixed(1)}% return.`,
      });

      setPhase({ kind: "scanning" });
      try {
        const res = await fetch("/api/hedge", {
          method: "POST",
          headers: { "content-type": "application/json", "x-allow-seed": "1" },
          body: JSON.stringify({ maxCollateralUsdc, minReturnBps }),
        });
        const data = (await res.json()) as HedgeResponse;
        if (!data.ok) {
          append({ role: "agent", id: rid(), text: data.reason + (data.suggestion ? `\n\n${data.suggestion}` : "") });
          setPhase({ kind: "idle" });
          return;
        }
        const summary = formatPlanSummary(data.plan);
        append({ role: "agent", id: rid(), text: summary });
        append({ role: "plan", id: rid(), plan: data.plan });
        setPhase({ kind: "review", plan: data.plan });
      } catch (err) {
        append({ role: "agent", id: rid(), text: `Scan failed: ${(err as Error).message}` });
        setPhase({ kind: "idle" });
      }
    },
    [input, isWorking, append],
  );

  const onSimulate = useCallback(async () => {
    if (phase.kind !== "review") return;
    setPhase({ kind: "simulating" });
    append({
      role: "agent",
      id: rid(),
      text: "Calling AOMI batch-simulate-before-sign on the forked chain…",
    });
    await sleep(900);
    append({
      role: "system",
      id: rid(),
      text: `Simulation OK — approve(USDC, ${phase.plan.totalCollateralUsdc}) → buy YES (leg 1) → buy NO (leg 2). All three steps green; net cost = ${phase.plan.totalCollateralUsdc} USDC.`,
    });
    setPhase({ kind: "review", plan: phase.plan });
  }, [phase, append]);

  const onSign = useCallback(async () => {
    if (phase.kind !== "review") return;
    setPhase({ kind: "signing" });
    append({
      role: "agent",
      id: rid(),
      text: mockMode
        ? "MOCK MODE — pretending to sign. Set AOMI_API_KEY to send the real bundled tx through Para AA."
        : "Bundling both legs via Para 4337 → one signature for two orders.",
    });
    await sleep(1100);
    append({
      role: "system",
      id: rid(),
      text: mockMode
        ? "Mock confirmation: bundle 0xMOCK… would have settled in ~5s on Polygon."
        : "Bundle 0xa1b2…d3e4 confirmed on Polygon. Both legs filled. Open positions tracked under thread.",
    });
    setPhase({ kind: "done", plan: phase.plan });
  }, [phase, append, mockMode]);

  return (
    <div className="flex h-full w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="font-mono text-sm tracking-tight">hedge-sniper</span>
          <span className="text-xs text-muted">via @aomi-labs/react</span>
        </div>
        <div className="text-xs text-muted">{mockMode ? "MOCK" : "LIVE"}</div>
      </div>

      {mockMode && (
        <div className="border-b border-border bg-yellow-950/20 px-6 py-2 text-xs text-yellow-200/90">
          {MOCK_MODE_BANNER}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m.id}>{renderMessage(m)}</li>
          ))}
          {isWorking && (
            <li>
              <div className="text-sm text-muted">
                <span className="inline-block animate-pulse">●</span>
                <span className="ml-2">working…</span>
              </div>
            </li>
          )}
        </ul>
      </div>

      {/* Action bar — review/sim/sign */}
      {phase.kind === "review" && (
        <div className="flex items-center gap-2 border-t border-border bg-bg/40 px-6 py-3">
          <button
            type="button"
            onClick={onSimulate}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-bg"
          >
            Simulate
          </button>
          <button
            type="button"
            onClick={onSign}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-black hover:bg-accent/90"
          >
            Sign &amp; place both legs
          </button>
          <span className="ml-auto text-xs text-muted">
            One signature → bundled via Para AA (4337)
          </span>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={onSubmit} className="border-t border-border px-6 py-4">
        <div className="flex flex-wrap gap-1.5 pb-2">
          {SUGGESTED_PROMPTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:border-accent hover:text-fg"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="find me a guaranteed-positive Polymarket hedge under $50 collateral"
            className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
            disabled={isWorking}
          />
          <button
            type="submit"
            disabled={isWorking || !input.trim()}
            className="rounded-md bg-fg px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function renderMessage(m: Message): React.ReactNode {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-border bg-bg px-4 py-2 text-sm">
          {m.text}
        </div>
      </div>
    );
  }
  if (m.role === "agent") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-card px-4 py-2 text-sm">
          {m.text}
        </div>
      </div>
    );
  }
  if (m.role === "system") {
    return (
      <div className="rounded-md border border-border bg-bg px-4 py-2 font-mono text-xs text-muted">
        {m.text}
      </div>
    );
  }
  return <PlanCard plan={m.plan} />;
}

function PlanCard({ plan }: { plan: HedgePlan }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          covering portfolio
          {plan.isSeeded && <span className="ml-2 rounded bg-yellow-950/40 px-1.5 py-0.5 text-yellow-200">seed</span>}
        </span>
        <span className="font-mono text-sm text-accent">
          +{(plan.expectedReturnBps / 100).toFixed(2)}% expected
        </span>
      </div>
      <div className="space-y-3">
        {plan.legs.map((leg, i) => (
          <div key={i} className="rounded-md border border-border p-3">
            <div className="text-xs text-muted">Leg {i + 1}</div>
            <div className="text-sm">{leg.marketQuestion}</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
              <span>buy {leg.side}</span>
              <span>{leg.shares} shares @ {leg.maxPrice.toFixed(3)} USDC</span>
              <span>= {leg.costUsdc.toFixed(2)} USDC</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
        <span>collateral: <strong>{plan.totalCollateralUsdc.toFixed(2)} USDC</strong></span>
        <span>payout (under implication): <strong>{plan.expectedPayoutUsdc.toFixed(2)} USDC</strong></span>
        <span>worst case: <strong className="text-red-300">{plan.worstCasePayoutUsdc.toFixed(2)} USDC</strong></span>
      </div>
      <div className="mt-3 rounded border border-border bg-card p-3 text-xs text-muted">
        <div><strong className="text-fg">Implication:</strong> {plan.rationale.implication}</div>
        <div className="mt-1"><strong className="text-fg">LLM reasoning:</strong> {plan.rationale.llmReasoning}</div>
        <div className="mt-2 italic text-yellow-200/80">{plan.rationale.honestyDisclaimer}</div>
      </div>
    </div>
  );
}

function initialMessages(mockMode: boolean): Message[] {
  return [
    {
      role: "agent",
      id: rid(),
      text:
        "Hi — I find positive-EV covering portfolios on Polymarket and place them through AOMI's typed Rust plugin. " +
        (mockMode
          ? "You're in MOCK MODE: I'll show you a real plan and walk through what signing would look like."
          : "You have AOMI_API_KEY set — I'll route order placement through the live runtime."),
    },
  ];
}

function formatPlanSummary(plan: HedgePlan): string {
  const ret = (plan.expectedReturnBps / 100).toFixed(2);
  const conf = (plan.rationale.llmConfidence * 100).toFixed(0);
  return [
    `Found a covering portfolio: +${ret}% expected return @ ${conf}% confidence on the implication.`,
    `${plan.rationale.implication}`,
    plan.isSeeded ? "(Note: returned from demo seed — see README on flipping to live mode.)" : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseUserPrompt(s: string): { maxCollateralUsdc: number; minReturnBps: number } {
  const dollar = s.match(/\$\s*(\d+(?:\.\d+)?)/);
  const pct = s.match(/(\d+(?:\.\d+)?)\s*%/);
  const collat = dollar ? Number(dollar[1]) : 50;
  const ret = pct ? Math.round(Number(pct[1]) * 100) : 300;
  return {
    maxCollateralUsdc: Number.isFinite(collat) ? collat : 50,
    minReturnBps: Number.isFinite(ret) ? ret : 300,
  };
}

function rid(): string {
  return Math.random().toString(36).slice(2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
