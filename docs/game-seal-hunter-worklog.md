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
Question: are PR #24's prey mechanics fair across screens, and is the hybrid actually fairer than
`main`? Measured with the harness (spread = (max−min)/mean across 16 profiles, lower = fairer).

> ⚠️ **The original numbers below were UNSEEDED at N=80 and are unreliable.** The harness used
> `Math.random()` directly, so the spread (an order statistic over 16 profiles → it amplifies
> per-round noise) swung **6.6%↔9.5% run-to-run on the *same* code** and could not actually
> separate the variants. The harness is now **seeded** (`SEED=` env, common random numbers across
> profiles) and a dedicated head-to-head tool exists. **Trust the seeded re-baseline, not these.**

| Prey model (unseeded N=80 — superseded) | Spread |
|---|---|
| Asymmetric flow-through (PR #24 as-is) | 22.5% (✗ big orientation bias) |
| Symmetric flow-through (all 4 edges open) | 14.1% |
| Hybrid + varied ±45° entry headings | ~~8.5%~~ (noise) |
| Hybrid + straight-in entry (branch HEAD) | ~~6.0%~~ (one lucky sample) |
| Original random-edge spawn (`main`) | ~~~8%~~ |

### 4a. Seeded re-baseline (2026-06-30) — `tools/compare-variants.mjs`, N=120, 2:1 clamp

All three variants run through the **exact same seeded stream** (common random numbers), two seeds:

| Variant | spread SEED=0 | spread SEED=7 | grand-mean catch | orientation bias |
|---|---|---|---|---|
| **main** (random-edge + world-scaled asym push) | **9.6%** | **9.1%** | ~88.8 | ✗ landscape ~85.8 vs portrait ~91–94 |
| **hybrid** (shuffle-bag + fixed sym push, straight-in) | 7.3% | **7.0%** | ~93.1 | ✓ |
| **varied** (hybrid + ±45° cone entry) | **7.1%** | 7.6% | ~93.2 | ✓ |

### 4b. Gold-standard confirmation — unseeded N=1000 + clamp comparison (2026-06-30)

`SEED=off` (real RNG, like the live game), N=1000/profile/variant, via `compare-variants.mjs`.
Numbers agree with the seeded re-baseline → the ranking is real, not a seeding artefact.

| Clamp | main | hybrid | varied |
|---|---|---|---|
| **2:1** (current `maxAspect`) | 8.6% (mean 88.9) | **6.4%** (93.4) | 7.3% (93.2) |
| **16:9** (1.778 — PR #24's fixed arena) | 6.1% (88.1) | 4.6% (92.7) | **4.3%** (92.4) |

**Settled findings (robust across seeded N=120 & unseeded N=1000):**
- **`main` is always the least fair** (8.6% / 6.1%) with a real **landscape disadvantage**
  (16:9 desktops ~86.5 vs portrait ~91–93). **The live alpha runs this** → adopting the hybrid is
  a measurable improvement.
- **hybrid ≈ varied** — within ~1 point, they swap rank between clamps → a tie. **Playtest: the
  user could not feel any difference between straight-in and ±45° even knowing which was which.**
  → **DECIDED: keep straight-in (hybrid HEAD), drop `varied`** (no fairness or feel benefit, less
  code). The `?entry=varied` toggle in `prey.js` + `tools/variants/prey-varied.js` are temporary
  and get removed.
- **The clamp is the only real fairness lever left** (the prey choice is settled). **16:9 is ~2
  points fairer than 2:1** for every variant, because every screen wider than 16:9 then plays the
  *identical* 960×540 field. The residual ~4.6% at 16:9 is the squarish small fields (4:3/16:10
  tablets ~89.5) being a touch harder than the wide fields (~93) — small and tunable.

**Prey decision: DECIDED → straight-in hybrid** (beats `main`; browser-verified: fills ≤clamp,
kelp-walls beyond it, prey clipped to the field, no console errors).

**OPEN DECISION → the clamp (fairness ↔ fill trade-off), one line in `core/balance.js`:**
1. **Keep 2:1** (`maxAspect: 2.0`) — fills almost every screen incl. tall phones; fairness 6.4%.
   Best immersion (esp. mobile); already live.
2. **Switch to 16:9** (`maxAspect: 1.7778`) — fairness 4.6%; but more dressed kelp-border on
   ultrawides *and* tall phones (less edge-to-edge on the primary mobile platform).
3. **A middle clamp** (~1.85–1.9) — harness can measure it to split fill vs fairness.

(Alpha stays on `main` until a PR is opened.)

---

## Fairness model (SH-02b) — quick reference
- **Short axis = 540 logical units (const).** Long axis fills the screen, clamped at
  `VIEW_CFG.maxAspect = 2.0`. Constant seal/fish speed & size. **Prey density constant** (count ∝
  area; the cap is only a perf guard). **catch rate ≈ density × speed × catch_width** → screen-
  independent once the aspect is bounded.
- The **"long thin field is easier"** effect is the whole reason the clamp exists. Bounded by 2:1.
- **Leaderboard** splits mobile/desktop (`pointer: coarse`) — absorbs portrait-vs-landscape, but
  NOT within-board aspect differences (so within-board spread is what matters most).

## The harness — `tools/fairness-sim.mjs` (now SEEDED)
- `node tools/fairness-sim.mjs [N]` (default 60 rounds/profile). A deterministic greedy-bot seal
  plays the **real game core** on each screen profile and prints catch rate ± sd. Lower spread =
  fairer. Industry-standard automated-playtest balancing; **reusable as a fairness regression
  guard** — re-run after any prey/seal/balance tweak.
- **Seeded RNG (2026-06-30).** It overrides the global `Math.random` (the game core's only source
  of randomness, in prey spawn) with a mulberry32 PRNG, re-seeded per round with a **profile-
  independent** seed (common random numbers). So the whole run is **reproducible** and the
  cross-profile spread reflects mechanics, not RNG luck. `SEED=<n>` picks another deterministic
  stream to confirm a result isn't a one-seed fluke. **Why it mattered:** unseeded, the spread
  swung 6.6%↔9.5% at N=80 on identical code — useless for ranking variants.
- `CLAMP=999 node tools/fairness-sim.mjs` → test "no clamp" (full-screen, unbounded). `CLAMP=2.4`
  etc. → test other clamps. Default uses the game's `VIEW_CFG.maxAspect`.
- It imports `core/sim.js` (stepSeal, spawnTick) + `entities/prey.js` (spawnPrey, updatePrey) +
  `core/balance.js` — so it measures exactly what ships.

## The variant comparison — `tools/compare-variants.mjs`
- `node tools/compare-variants.mjs [N]` (default 120). Runs **main vs hybrid vs varied** through
  one shared seeded stream (common random numbers across variants & profiles) and prints a per-
  profile 3-column table + each variant's spread & grand-mean catch. This is what produced §4a.
- hybrid = the **shipped** `entities/prey.js`. main & varied are headless variant modules in
  `tools/variants/` (`prey-main.js` = the `seal-hunt-v1-original` mechanics; `prey-varied.js` =
  hybrid + ±45° cone entry). It re-implements `spawnTick` locally because `sim.js`'s is hard-bound
  to the shipped prey module. **Dev-only; not loaded by the game.**
- `SEED=<n>` / `CLAMP=<n>` as above.

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
- `tools/fairness-sim.mjs` — the (seeded) single-config fairness harness.
- `tools/compare-variants.mjs` + `tools/variants/` — the seeded main-vs-hybrid-vs-varied head-to-
  head (dev-only; produced §4a). Not loaded by the game.
- `docs/game-seal-hunter.md` — technical reference (kept in sync).

## Next steps / open items
1. **Resolve the prey decision** (§4) — fairness is now a *tie* between hybrid & varied (both ~7%,
   both beat `main`'s ~9%), so it's a look call. Then browser-verify (done for hybrid) and PR.
2. **Confirm the alpha** (sealthehunter.online) reflects `main` (auto-deploy from `main`). NB the
   alpha currently runs the **least-fair** prey model — adopting either branch variant improves it.
3. *(Optional)* tighten the residual aspect spread further (tighter clamp, or a calibrated
   per-aspect difficulty compensation) — the now-seeded harness can drive it reliably.

> **Local visual testing:** the game is static (`public/games/seal-hunt-v1/`). Serve it over HTTP
> (ES modules + service worker need it) and it can be checked **standalone** and **iframed at any
> width** — the 2:1 clamp/border keys off the canvas/iframe CSS size, so an iframe of a given size
> simulates a screen of that size. (This session used a throwaway static server + an iframe device
> wall; not committed.)
