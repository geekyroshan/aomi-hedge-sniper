#!/usr/bin/env tsx
/**
 * verify-env.ts — pre-flight check for hedge-sniper.
 *
 * Reads .env.local (or .env) and prints a human checklist of which keys
 * are required, which are optional, and which are missing. Does NOT crash
 * the dev server — designed to be run before `pnpm dev` so a stranger can
 * tell from one command what they still need to fill in.
 *
 * Usage:
 *   pnpm verify-env
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

type KeyDef = {
  key: string;
  required: boolean;
  why: string;
  fallbackBehavior?: string;
};

const KEYS: KeyDef[] = [
  {
    key: "AOMI_API_KEY",
    required: false,
    why: "Authenticates the AOMI hosted runtime. Without it, the demo runs in MOCK MODE.",
    fallbackBehavior: "Mock mode — UI still works, order placement is simulated.",
  },
  {
    key: "AOMI_BASE_URL",
    required: false,
    why: "AOMI runtime endpoint. Defaults to https://aomi.dev.",
  },
  {
    key: "NEXT_PUBLIC_AOMI_APP",
    required: false,
    why: "Which AOMI plugin to load. Defaults to 'polymarket'.",
  },
  {
    key: "OPENAI_API_KEY",
    required: false,
    why: "Used by the LLM correlation extractor.",
    fallbackBehavior: "Live scan disabled — /api/hedge falls back to seed when 'x-allow-seed: 1'.",
  },
  {
    key: "POLYGON_RPC_URL",
    required: false,
    why: "Polygon RPC for any direct CLOB calls. Defaults to public RPC.",
  },
  {
    key: "WALLET_PRIVATE_KEY",
    required: false,
    why: "Demo wallet private key. Only needed if you want to flip to LIVE mode and place a real on-chain hedge.",
    fallbackBehavior: "No on-chain action; mock mode.",
  },
];

function readEnvFile(path: string): Record<string, string> {
  try {
    const txt = readFileSync(path, "utf8");
    const out: Record<string, string> = {};
    for (const raw of txt.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function main(): void {
  const root = join(__dirname, "..");
  const envLocal = readEnvFile(join(root, ".env.local"));
  const envBase = readEnvFile(join(root, ".env"));
  const merged: Record<string, string> = { ...envBase, ...envLocal, ...process.env };

  const lines: string[] = [];
  let missingRequired = 0;
  let missingOptional = 0;

  lines.push("");
  lines.push("hedge-sniper — environment check");
  lines.push("─".repeat(60));

  for (const def of KEYS) {
    const v = merged[def.key];
    const has = !!(v && v.length > 0);
    const tag = has ? "[ OK ]" : def.required ? "[MISS]" : "[opt ]";
    const valueShown = has ? truncate(v, 14) : "—";
    lines.push(`${tag} ${def.key.padEnd(28)} ${valueShown}`);
    if (!has) {
      lines.push(`         why: ${def.why}`);
      if (def.fallbackBehavior) {
        lines.push(`         fallback: ${def.fallbackBehavior}`);
      }
      if (def.required) missingRequired++;
      else missingOptional++;
    }
  }

  lines.push("─".repeat(60));
  if (missingRequired > 0) {
    lines.push(`✗ ${missingRequired} required key(s) missing — see above. Copy .env.example to .env.local and fill them in.`);
  } else if (missingOptional > 0) {
    lines.push(`✓ All required keys set. ${missingOptional} optional key(s) missing — demo runs in MOCK MODE for those features.`);
  } else {
    lines.push("✓ All keys set. Ready to run `pnpm dev` in LIVE mode.");
  }
  lines.push("");

  console.log(lines.join("\n"));
  // Never crash — verify-env is informational.
  process.exit(0);
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

main();
