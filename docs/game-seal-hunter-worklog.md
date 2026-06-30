# Seal The Hunter — fairness & full-screen rework: work log / handoff

> **Cross-session handoff.** Read this + [`game-seal-hunter.md`](game-seal-hunter.md) (technical
> reference) to get full context with no re-explanation. Game code: `public/games/seal-hunt-v1/`.
> Last updated: **2026-06-30**.

---

## TL;DR — current state

- **`main` (PR #25 merged, `ec391f6`)** — the game runs **full-screen** with a **2:1 play-field
  aspect clamp** for fair play, plus an extracted **sim core** (`core/sim.js`), a **fairness
  harness** (`tools/fairness-sim.mjs`), and a **diegetic border** (kelp walls / seabed / sea
  surface with waves + boat) on screens wider/taller than 2:1. **Prey on main = the ORIGINAL
  random-edge spawn.**
- **This branch `feat/game-prey-mechanics`** — harness experiments on the prey mechanics. Current
  state = the **fairest hybrid** (shuffle-bag spawn + original "fish stay" edge-push, 6.0% spread).
  **There is an OPEN DECISION** (see §4) about which prey variant to adopt.
- **Restore point** — tag **`seal-hunt-v1-original`** (`fcf14d7`) = the original game before any of
  this. Restore the game alone: `git checkout seal-hunt-v1-original -- public/games/seal-hunt-v1`.
- **Alpha** — sealthehunter.online auto-deploys from `main` (see `DEPLOYMENT.md`); confirm it
  reflects PR #25.

---

## 1. Original problem
On wide screens/frames, black bars appeared that the seal couldn't swim into — the play field was
clamped at 1.9:1 and the leftover was letterboxed with flat dark water.

## 2. PR #24 (`feat/game-fair-arena-border`, `2c76fc8`) — merged, then ROLLED BACK
First attempt: a **fixed arena + diegetic border** (kelp walls, seabed, sky, boats, water-gradient
fix) **plus a big prey-mechanics overhaul** (lateral flow-through, shuffle-bag spawn, varied bottom
heading, a flying fish added then removed, a cull-bug fix). It was merged to main, then the user
**rolled it all back** — they didn't want the prey-mechanics changes on the live alpha yet, and the
visuals were entangled in the same files, so it was all-or-nothing. `main` was hard-reset to
`fcf14d7` and force-pushed. The branch is **kept for reference** (PR #24 on GitHub still shows
"merged" — cosmetic only; the commits are no longer in `main`'s history).

## 3. PR #25 (`feat/game-fullscreen-fair`) — MERGED to `main`
The chosen direction: **full-screen, kept fair by measurement.**
- **Why a clamp at all:** the harness proved pure "always full-screen" gives ultra-wide a real
  **~8% catch-rate advantage** on the leaderboard — a long, thin field is genuinely easier to hunt,
  and scaling prey density with area does NOT fix it (it's the field *shape*). A **2:1 clamp**
  flattens it (desktop spread ~8% → ~3%) while still filling the screen for **every ≤2:1
  screen/window** (16:9, 16:10, ~2:1). Only true ultra-wide / very-tall (>2:1) gets a border.
- **Sim core** extracted to `core/sim.js` (DOM-free) so the harness runs the *exact* game logic.
- **Harness** `tools/fairness-sim.mjs` (automated bot, see §Harness).
- **Border** dressing on >2:1 (kelp walls on sides; seabed + sky/waves/boat on top/bottom).
- Works identically standalone and iframed (keys off the canvas/container size).

## 4. This branch — prey-mechanics fairness experiments (OPEN)
Question: are PR #24's prey mechanics fair across screens? Measured with the harness, **all
resolutions, N=80, 2:1 clamp** (spread = (max−min)/mean, lower = fairer):

| Prey model | Spread | Orientation bias | Notes |
|---|---|---|---|
| Asymmetric flow-through (PR #24 as-is) | **22.5%** | ✗ big | landscape ~100 vs portrait ~84 |
| Symmetric flow-through (all 4 edges open) | 14.1% | ✓ fixed | aspect-sensitive; harder (fish leak everywhere) |
| Hybrid + varied ±45° entry headings | 8.5% | ✓ fixed | ≈ original fairness; keeps the diagonal-entry look |
| **Hybrid + simple straight-in entry** (← current branch HEAD `547a30c`) | **6.0%** | ✓ fixed | **fairest of all; beats `main`**; camp-proof spawn |
| Original random-edge spawn (on `main`) | ~8% | ✗ | uneven: ~3% desktop / ~7% mobile, orientation bias |

**Findings**
- PR #24's flow-through (top/bottom = surface/seabed WALLS, left/right OPEN, fish exit laterally)
  is **rotation-ASYMMETRIC** → short/wide fields are much easier → big orientation bias (unfair).
- Making it **symmetric** (all 4 edges open) removes the orientation bias but the flow-through's
  *leakage* amplifies the aspect effect (squarish 4:3 vs elongated 2:1) → still ~14%.
- The **hybrid** — keep PR #24's genuinely-good **shuffle-bag spawn** (even over all 4 edges, no
  camping) but use the original **"fish stay" physics** (a soft inward **edge-push**, made
  symmetric: fixed 42-unit band on both axes) — is the **fairest variant (6.0%)**, rotation-
  symmetric and uniform (~6% on both boards), so it **beats `main`** while keeping the camp-proof
  spawn.
- The **varied ±45° entry headings** (a look the user liked earlier) cost ~2.5% (8.5% vs 6.0%), so
  they're dropped in the current HEAD. Restore if the look is worth it.

**OPEN DECISION (pick one):**
1. **Adopt the hybrid** (current HEAD, 6.0%, fairest + camp-proof spawn) → browser-verify the look
   (fish enter/stay, nothing renders in the border) → open a PR.
2. **Keep the varied-entry hybrid** (8.5%, the diagonal-entry look) instead.
3. **Keep `main` as-is** — the experiment confirmed the original is already solid.

---

## Fairness model (SH-02b) — quick reference
- **Short axis = 540 logical units (const).** Long axis fills the screen, clamped at
  `VIEW_CFG.maxAspect = 2.0`. Constant seal/fish speed & size. **Prey density constant** (count ∝
  area; the cap is only a perf guard). **catch rate ≈ density × speed × catch_width** → screen-
  independent once the aspect is bounded.
- The **"long thin field is easier"** effect is the whole reason the clamp exists. Bounded by 2:1.
- **Leaderboard** splits mobile/desktop (`pointer: coarse`) — absorbs portrait-vs-landscape, but
  NOT within-board aspect differences (so within-board spread is what matters most).

## The harness — `tools/fairness-sim.mjs`
- `node tools/fairness-sim.mjs [N]` (default 60 rounds/profile). A deterministic greedy-bot seal
  plays the **real game core** on each screen profile and prints catch rate ± sd. Lower spread =
  fairer. Industry-standard automated-playtest balancing; **reusable as a fairness regression
  guard** — re-run after any prey/seal/balance tweak.
- `CLAMP=999 node tools/fairness-sim.mjs` → test "no clamp" (full-screen, unbounded). `CLAMP=2.4`
  etc. → test other clamps. Default uses the game's `VIEW_CFG.maxAspect`.
- It imports `core/sim.js` (stepSeal, spawnTick) + `entities/prey.js` (spawnPrey, updatePrey) +
  `core/balance.js` — so it measures exactly what ships.

## Branches & tags
| Ref | Commit | What |
|---|---|---|
| `main` | `ec391f6` | full-screen + 2:1 clamp + sim core + harness + border. Original prey. |
| tag `seal-hunt-v1-original` | `fcf14d7` | original game, restore point |
| `feat/game-fair-arena-border` | `2c76fc8` | PR #24 (fixed arena + border + prey flow-through). Reference only. |
| `feat/game-prey-mechanics` | `547a30c` | **this** — hybrid prey experiments (current HEAD = fairest hybrid) |

## Key files
- `core/balance.js` — `VIEW_CFG` (`maxAspect: 2.0`), `computeWorld`, `recomputeBalance`.
- `core/sim.js` — `stepSeal`, `spawnTick`, `ROUND_MS` (shared, DOM-free sim core).
- `entities/prey.js` — prey spawn + behaviour (current = the hybrid).
- `render/scenery.js` — underwater scene + the diegetic border (kelp walls / seabed / sky+boat).
- `game.js` — entrypoint: `resize()`, `drawFrame()`, `loop()`, `update()` (thin; drives sim core).
- `tools/fairness-sim.mjs` — the fairness harness.
- `docs/game-seal-hunter.md` — technical reference (kept in sync).

## Next steps / open items
1. **Resolve the prey decision** (§4). If adopting the hybrid: browser-verify the look, then PR.
2. **Confirm the alpha** (sealthehunter.online) reflects `main` (auto-deploy from `main`).
3. *(Optional)* tighten the residual aspect spread further (tighter clamp, or a calibrated
   per-aspect difficulty compensation) — the harness can drive it.
