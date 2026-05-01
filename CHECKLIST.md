# Roshan's Manual-Steps Checklist — Hedge Sniper Submission

> Everything below is what only YOU can do. The code, content, and docs are in
> `interviews/aomi-labs/hedge-sniper/` and verified working.
> Submit by Sunday EOD per the JD; aim for Day-2 ship per rubric.

---

## What's already done (don't redo)

- ✅ Full repo built — Next.js 15 + `@aomi-labs/react` + custom `<HedgeFrame/>` + analytics API + Rust stub + Skill manifest
- ✅ `pnpm install` clean (467 packages)
- ✅ `pnpm --filter web typecheck` PASS
- ✅ `pnpm --filter web build` PASS (4 routes, 103 kB First Load)
- ✅ `pnpm verify-env` works — prints a human checklist
- ✅ All 4 distribution artifacts written: `thread.md` (7 posts, all <280 chars), `video-script.md` (60s, shot-by-shot), `blog.md` (1561 words), `one-pager.md` (532 words)
- ✅ README ready (<5 min clone-to-running, moat-mapping table, Kalshi fork guide)
- ✅ `MOAT-ANALYSIS.md` ready as your interview talking-points cheat-sheet for "what should our brand be?"

---

## Step 1 — Smoke-test locally (30 min)

```bash
cd /Users/roshankharel/Code/JOBHUNT/interviews/aomi-labs/hedge-sniper
pnpm dev
# open http://localhost:3000
# type: "find me a 3%+ hedge under $50"
# verify: scan → plan card → simulate → sign → mock confirmation
```

If anything breaks, the most likely culprit is the seed-fallback path — check `apps/web/lib/seed.ts` and the request flow in `apps/web/components/HedgeFrame.tsx`.

---

## Step 2 — Get keys + go LIVE (1–2 hours)

| Key | Where | Notes |
|---|---|---|
| `AOMI_API_KEY` | DM the founder on Telegram or check `aomi.dev` dashboard | Without this you stay in MOCK mode. Required for the "live signing" video shot. |
| `OPENAI_API_KEY` | platform.openai.com | $5 of credit is plenty. Model used: `gpt-4o-mini`. |
| `WALLET_PRIVATE_KEY` | Generate fresh in MetaMask, export hex | **DO NOT use your main wallet.** Fund with ~$60 USDC on Polygon. |
| `POLYGON_RPC_URL` | Alchemy or QuickNode free tier | Public RPC works for the demo but slower. |

Drop into `.env.local` (copy from `.env.example`). Run `pnpm verify-env` — should show all green.

Quick LIVE-mode smoke test:
```bash
pnpm dev
# in browser: same prompt as before, but flip mockMode to false
# (apps/web/app/page.tsx — the prop on <HedgeFrame mockMode={...} />)
```

If a live hedge isn't available at demo time, the seed plan kicks in and is labeled `seed` — film that one, don't pretend it's live.

---

## Step 3 — Record the 60s video (45 min)

Follow `distribution/video-script.md` to the letter. Pre-flight checklist is in there — DND on, terminal pre-set, wallet pre-connected.

- Tool: QuickTime + iMovie (free) or ScreenFlow
- 1920×1080, 30fps, no music
- One take is fine; cuts at shot boundaries are OK
- If voice-over feels rough, use the 3-line caption-only fallback (also in the script)

Output: `hedge-sniper-demo.mp4` (≤60s, ≤30MB for X upload).

---

## Step 4 — Update placeholders in distribution (15 min)

Artifacts already use the locked seed-mode numbers (`+6.38%` expected return,
`$47` collateral, `$50` payout, `0.78` confidence, `200+` markets). Only swap
these if you record in **LIVE mode** and want to publish the live numbers:

- **`6.38%`** → actual return your LIVE demo produced
- **`$47` / `$50`** → actual collateral / payout from LIVE scan
- **`200+ markets`** → whatever `enrichWithOrderBook` logged (open dev tools while scanning)
- **`0.78 confidence`** → actual LLM confidence in the LIVE plan
- **`Started: __ Shipped: __`** in `one-pager.md` → fill with your actual dates/hours
- **`github.com/geekyroshan/aomi-hedge-sniper`** → confirm this is the slug you push to

---

## Step 5 — Push public to GitHub (15 min)

```bash
cd /Users/roshankharel/Code/JOBHUNT/interviews/aomi-labs/hedge-sniper
git init
git add .
git commit -m "feat: hedge sniper - 2-day take-home for AOMI Labs"
gh repo create aomi-hedge-sniper --public --source=. --remote=origin --push
```

Check the public repo:
- README hero loads cleanly
- All distribution files are visible
- Skill manifest at `skill/SKILL.md` is reachable
- No `.env.local` accidentally committed (`.gitignore` should handle it — verify with `git log --all -- .env.local`)

---

## Step 6 — Post the X thread (10 min)

From `@geekyroshan_`. Use `distribution/thread.md` verbatim — it's tuned to <280 chars.

- P1 attachment: screenshot of your AomiFrame with the live hedge plan visible. Crop tight, include the prompt + agent response + hedge card.
- P3 attachment: the ASCII architecture diagram from `docs/ARCHITECTURE.md` rendered as a clean image (use Carbon or similar).
- Tag `@aomi_labs` once in P1, once in P7 (CTA).
- Pin the thread to your profile.

Optional: drop the video as a reply to the hook post.

---

## Step 7 — Submit to AOMI (10 min)

Per JD: "send the deliverables." Check the founder's Telegram or the email channel they set up. Submit:

- Repo URL: `https://github.com/geekyroshan/aomi-hedge-sniper`
- X thread URL: `https://x.com/geekyroshan_/status/...`
- One-pager: paste the body of `one-pager.md` into the message OR attach as PDF
- Video: link to the X post, or upload to Loom

**Mention the day you started.** The JD calls this out explicitly.

---

## Step 8 — The walkthrough call (45 min, scheduled separately)

Per the JD's Stage 3, you'll walk them through:
- What you built and why
- The distribution artifact
- What you'd do with another week

**Pre-call prep (30 min before):**
- Re-read `MOAT-ANALYSIS.md` § 7 (the talking points for "what should our brand be?") — that's the founder's open question.
- Re-read `INTERVIEW-PREP.md` for your honest-gap framing.
- Have your repo, the live demo, the X thread, and the one-pager all open in tabs.
- Re-watch the 60s video once so you know exactly when to pause and explain.

**Talking-point order for the walkthrough:**
1. The persona (Maya, mid-tier Polymarket trader).
2. The architecture in 60s (point at the diagram in the README).
3. The hedge math + honest disclaimer (positive-EV under implication, not risk-free).
4. **The moat the build proves** — typed Rust plugin = order shape can't be malformed; widget = chat+wallet+sim+sign in one tag; AA = two legs in one signature.
5. **What I'd build next + my read on positioning** — segue into the wallet-integration kit (Idea 2 reframed as roadmap) and the brand recommendation: *"AOMI is the build-and-ship layer for on-chain AI agents."*

If the founder asks "so what should our brand be?" — go to MOAT-ANALYSIS § 5–7 verbatim. You've already done the work.

---

## Risk register (what could go wrong, what to do)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Live Polymarket hedge isn't available at demo time | Med | Seed plan kicks in automatically — labeled `seed`. Film with seed; mention in voiceover. |
| `@aomi-labs/react` headless runtime doesn't ship the events you need for full LIVE mode | Med | README is honest about this. The demo works in MOCK mode for reviewers; flag it in the walkthrough. |
| Para AA fails on Polygon at signing time (network/bundler issue) | Low-Med | Have a backup wallet + standard EOA path documented. Mention AA as the "production goal." |
| GPT-4o-mini hallucinates a bad implication on demo day | Med | The 0.7 confidence floor + worst-case disclosure handle this. If a clearly bad plan surfaces, reload — temperature is 0 but the universe re-fetches. |
| You can't get an `AOMI_API_KEY` in time | Med-High | Submit in MOCK mode. The README is explicit. Founder will understand — they wrote the rubric, they know the constraints. |
| Founder asks why you didn't fork the SDK and write a Rust plugin | Med | Honest answer: "2-day rubric. The Rust port stub is in `/rust-plugin/`. The TS path proves the moat without the Rust learning curve eating Day 1. PR to `aomi-sdk/apps/` is week 2." |

---

## Total time budget

| Step | Hours | Cumulative |
|---|---|---|
| 1. Smoke test | 0.5 | 0.5 |
| 2. Get keys + LIVE | 1.5 | 2.0 |
| 3. Record video | 0.75 | 2.75 |
| 4. Update placeholders | 0.25 | 3.0 |
| 5. Push public | 0.25 | 3.25 |
| 6. Post X thread | 0.25 | 3.5 |
| 7. Submit | 0.25 | 3.75 |
| 8. Walkthrough prep | 0.5 | 4.25 |

**~4 hours of your time** for everything I cannot do. Leaves headroom for iteration. Ship Sunday.

---

## Anti-todos (resist these)

- ❌ Don't restyle `<HedgeFrame/>`. The widget is the UI.
- ❌ Don't backfill the Rust plugin "to look complete." Half-done with honest README beats fake-complete.
- ❌ Don't write a second video / longer demo. 60s ≥ 5min on the rubric.
- ❌ Don't add a settings page, a dashboard, or "advanced mode."
- ❌ Don't soften the honest disclaimer. The "positive-EV under implication" framing is a *strength* — it's the rubric move.
- ❌ Don't ship Day 3 polish. Submit Sunday Day-2 night. Tell them the day you started.
