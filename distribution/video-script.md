# Video Script — 60 Second Demo

> 60s hard cap. Voice + captions. No music. No intro card.
> Records straight into the action. Per SPEC § 8.

---

## Setup checklist (do this BEFORE you hit record)

- [ ] Browser: Chrome, 1920×1080, single window. ONE tab open: `localhost:3000` (the hedge-sniper page with empty `<AomiFrame/>`).
- [ ] Second tab pre-loaded but background: a terminal in iTerm2 (Menlo 18pt, dark bg) at the repo root, ready to run `pnpm exec aomi chat --skill hedge-sniper`.
- [ ] Wallet: Para AA wallet pre-connected to the AomiFrame. USDC pre-funded (~$60 on Polygon). Verified by clicking the wallet icon once before recording — should show green dot.
- [ ] Pre-flight test the hedge detector: run `pnpm tsx scripts/seed-hedge-demo.ts --dry-run` to confirm a live hedge exists. **If no live hedge meets the criteria, run `seed-hedge-demo.ts` to seed a deterministic fake market pair** so the demo is reproducible.
- [ ] Browser zoom: 110% (text legible at 1080p).
- [ ] Hide bookmarks bar (`Cmd+Shift+B`).
- [ ] Mac: Do Not Disturb on. Slack/Discord/iMessage quit.
- [ ] Record at 1920×1080, 30fps, ScreenFlow or QuickTime + iMovie cuts.
- [ ] Mic test before takes. Aim for 30dB room noise floor or quieter.

---

## Shot 1 — Hook frame (0–3s, 3s)

| | |
|---|---|
| **Visual** | Browser at `localhost:3000`. Empty `<AomiFrame/>` chat in center. URL bar visible. |
| **Voice** | "Polymarket has 500+ live markets. Most retail traders never see hedges. Watch this." |
| **Caption** | `500+ live markets. Hedges hiding in correlated pairs. Watch.` |
| **Action** | Static. No clicks yet. Cursor is parked outside the frame. |

---

## Shot 2 — User types the prompt (3–8s, 5s)

| | |
|---|---|
| **Visual** | Cursor moves into the AomiFrame input. Text appears character-by-character (real typing, not pasted). |
| **Voice** | (typing audible — let it breathe, don't talk over it) |
| **Caption** | `User input` |
| **Action** | Type: `find me a guaranteed 3%+ hedge under $50 collateral, please.` Hit Enter. |

---

## Shot 3 — Agent streams (8–15s, 7s)

| | |
|---|---|
| **Visual** | Agent message streams token-by-token. Highlight the "Scanning 200+ markets" line by hovering or freezing it. |
| **Voice** | "It's calling a custom analytics tool — pulls the orderbook, asks an LLM to extract logical implications, and ranks covering portfolios. (In this take, the agent serves the seed plan because the live scan didn't surface a candidate within the user's thresholds.)" |
| **Caption** | `Scanning 200+ markets · LLM implication extraction · Covering portfolio math` |
| **Action** | None — let the stream play. |

---

## Shot 4 — Hedge plan card renders (15–25s, 10s)

| | |
|---|---|
| **Visual** | The HedgePlan card renders inside AomiFrame: 2 legs (Trump primary YES + Trump general NO), total cost $47, expected payout $50, return 6.38%, confidence 0.78, sim-status pending. |
| **Voice** | "It found a 6.38% covering portfolio. The LLM extracted that primary-YES implies general-NO with 0.78 confidence. The card shows the worst case if that implication fails." |
| **Caption** | `6.38% expected return · 0.78 implication confidence · seed plan (live mode in repo)` |
| **Action** | Hover over the "rationale" expand-arrow on the card to make the worst-case scenario visible for ~2s. |

---

## Shot 5 — Simulate (25–35s, 10s)

| | |
|---|---|
| **Visual** | Click "Simulate." Forked-chain dry-run renders: 3 lines green — `approve USDC ✓`, `buy YES on M1 ✓`, `buy NO on M2 ✓`. Gas: $0.00 (paymaster). |
| **Voice** | "Aomi simulates the entire plan on a forked chain — approve, leg one, leg two — before any signature. The polymarket plugin is a typed Rust struct, so the agent literally cannot malform the order." |
| **Caption** | `Batch simulate-before-sign · typed Rust plugin · agent can't malform tx` |
| **Action** | Click "Simulate" button. Wait for green. |

---

## Shot 6 — Sign (35–45s, 10s)

| | |
|---|---|
| **Visual** | Click "Sign." Para wallet popup appears showing ONE signature for the bundled UserOp. Confirm. On-chain confirmation toast: "Hedge filled — tx 0x…". |
| **Voice** | "One signature for two legs. Account abstraction via Aomi's Para integration — 4337 with paymaster, gasless to the user." |
| **Caption** | `1 signature · 2 legs · EIP-4337 + paymaster · gasless` |
| **Action** | Click "Sign" → click "Confirm" in Para popup. |

---

## Shot 7 — CLI surface (45–55s, 10s)

| | |
|---|---|
| **Visual** | Cmd+Tab to terminal. Run `pnpm exec aomi chat --skill hedge-sniper`. Same hedge prompt fires from CLI. Same HedgePlan renders in TTY. |
| **Voice** | "Same skill in Claude Code or the CLI. Aomi syncs the session across surfaces — the wallet state from the browser is right here in the terminal." |
| **Caption** | `Same session · widget + CLI + Claude skill · one runtime` |
| **Action** | Cmd+Tab → run command → let the response render → don't sign again, just show the plan. |

---

## Shot 8 — Repo CTA (55–60s, 5s)

| | |
|---|---|
| **Visual** | Cut to GitHub repo page `github.com/geekyroshan/aomi-hedge-sniper`. README hero visible. |
| **Voice** | "Repo and thread linked. Built in 2 days on Aomi. Fork it." |
| **Caption** | `github.com/geekyroshan/aomi-hedge-sniper · 2 days · @aomi_labs` |
| **Action** | Static frame. Hold for 2s, fade. |

---

## Voice-over alternative (3-line caption-only version)

If Roshan wants captions instead of voice (faster to record, no mic-quality risk), use these three running captions instead — paste into the bottom-third overlay, one per ~20s segment:

1. **0–20s:** `One sentence to Claude → 200+ Polymarket markets scanned → 6.38% covering portfolio returned in seconds. Positive EV under the LLM-extracted implication.`
2. **20–45s:** `Aomi's typed Rust polymarket plugin makes the trade compile-time-safe. Batch simulation runs the full plan on a forked chain. One signature signs both legs via 4337 + paymaster.`
3. **45–60s:** `Same skill works in Claude Code, the CLI, and the widget. Built in 2 days. github.com/geekyroshan/aomi-hedge-sniper`

---

## Total runtime budget

| Shot | Duration | Cumulative |
|---|---|---|
| 1. Hook | 3s | 3 |
| 2. Type prompt | 5s | 8 |
| 3. Agent streams | 7s | 15 |
| 4. Card renders | 10s | 25 |
| 5. Simulate | 10s | 35 |
| 6. Sign | 10s | 45 |
| 7. CLI surface | 10s | 55 |
| 8. Repo CTA | 5s | 60 |

If a shot runs long, cut shot 7 first (CLI is the bonus surface, not the core demo).
