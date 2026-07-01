# Seal The Hunter — fairness & full-screen rework: work log / handoff

> **Cross-session handoff.** Read this + [`game-seal-hunter.md`](game-seal-hunter.md) (technical
> reference) to get full context with no re-explanation. Game code: `public/games/seal-hunt-v1/`.
> Last updated: **2026-06-30**.

---

## TL;DR — current state

- ✅ **RESOLVED & SHIPPED — PR #26 merged to `main` (`566f673`, 2026-06-30), deployed to alpha.**
  The prey-mechanics experiment is closed: the game now ships the **straight-in hybrid** prey
  (shuffle-bag 4-edge spawn + fixed *symmetric* edge-push), the **clamp stays 2:1**, and the
  fairness harness is now **seeded**. See §4 for the decision + numbers.
- **Fairness model (now on `main`)** — full-screen, **2:1 play-field aspect clamp**, extracted
  **sim core** (`core/sim.js`), **seeded fairness harness** (`tools/fairness-sim.mjs`) + variant
  head-to-head (`tools/compare-variants.mjs`), and a **diegetic border** (kelp walls / seabed / sea
  surface + boat) on screens wider/taller than 2:1.
- **Prey on `main` = the hybrid** (was: original random-edge spawn, which measured as the *least*
  fair — see §4b).
- **Restore point** — tag **`seal-hunt-v1-original`** (`fcf14d7`) = the original game before any of
  this. Restore the game alone: `git checkout seal-hunt-v1-original -- public/games/seal-hunt-v1`.
- **Alpha** — sealthehunter.online auto-deploys from `main` (see `DEPLOYMENT.md`); reflects PR #26.

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

## 4. Prey-mechanics fairness experiments — ✅ RESOLVED & SHIPPED (PR #26)
Question: are PR #24's prey mechanics fair across screens, and is the hybrid actually fairer than
`main`? Measured with the harness (spread = (max−min)/mean across 16 profiles, lower = fairer).
**Outcome: the straight-in hybrid @ 2:1 clamp shipped in PR #26 (merged `566f673`, 2026-06-30).**

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
  → **DECIDED: keep straight-in (now on `main`), drop `varied`** (no fairness or feel benefit, less
  code). The temporary `?entry=varied` toggle in `prey.js` was **removed**; `tools/variants/
  prey-varied.js` is **kept** as a variant snapshot for regression/reference.
- **The clamp is the only real fairness lever left** (the prey choice is settled). **16:9 is ~2
  points fairer than 2:1** for every variant, because every screen wider than 16:9 then plays the
  *identical* 960×540 field. The residual ~4.6% at 16:9 is the squarish small fields (4:3/16:10
  tablets ~89.5) being a touch harder than the wide fields (~93) — small and tunable.

**Prey decision: SHIPPED → straight-in hybrid** (PR #26; beats `main`; browser-verified: fills
≤clamp, kelp-walls beyond it, prey clipped to the field, no console errors).

**Clamp decision: SHIPPED → keep 2:1** (`maxAspect: 2.0`, unchanged). The clamp was the only real
fairness lever left and it's a fairness ↔ fill trade-off:
1. ✅ **2:1 (chosen)** — fills almost every screen incl. tall phones; fairness 6.4%. Best immersion
   (esp. mobile, the primary platform).
2. **16:9** (`1.7778`) — ~2 pts fairer (4.6%) but ~doubles the dressed border on ultrawides *and*
   tall phones — not worth the mobile-fill cost. (One-line change in `core/balance.js` if revisited.)
3. **A middle clamp** (~1.85–1.9) — not pursued; the harness can measure it if ever wanted.

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
  profile 3-column table + each variant's spread & grand-mean catch. This is what produced §4a/§4b.
- hybrid = the **shipped** `entities/prey.js`. main & varied are headless variant modules in
  `tools/variants/` (`prey-main.js` = the `seal-hunt-v1-original` mechanics; `prey-varied.js` =
  hybrid + ±45° cone entry). It re-implements `spawnTick` locally because `sim.js`'s is hard-bound
  to the shipped prey module. **Dev-only; not loaded by the game.**
- `SEED=<n>` / `CLAMP=<n>` as above.

## Branches & tags
| Ref | Commit | What |
|---|---|---|
| `main` | `566f673` | full-screen + 2:1 clamp + sim core + **seeded** harness + border + **hybrid prey** (PR #26). |
| tag `seal-hunt-v1-original` | `fcf14d7` | original game, restore point |
| `feat/game-fair-arena-border` | `2c76fc8` | PR #24 (fixed arena + border + prey flow-through). Reference only. |
| ~~`feat/game-prey-mechanics`~~ | `4507b61` | hybrid prey experiments — **merged via PR #26 & deleted**. |

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

## 5. Visual/UX cycle — leaderboard fixes + static backdrop (PRs #28–#32, 2026-06-30)

Same session, after the prey decision. Full technical state lives in
[`game-seal-hunter.md`](game-seal-hunter.md) (backdrop + transition sections); this is the journal.

**Merged to `main` (leaderboard + game-over UX):**
- **#28** — the "Вы: #N" summary disagreed with the highlighted row on **ties** (server gave
  *competition* rank, the table is *ordinal*). Fix: derive the summary from the player's actual
  rendered row → single source of truth. **Not a desync** (reproducible from ties).
- **#29** — on small/portrait phones the leaderboard pushed the bottom **feedback line** off-screen.
  Overlay `safe center` + scroll, compact board → the whole card fits.
- **#30 / #31** — game-over **interstitial**: a stable "time's up, считаем улов…" beat while the
  score submits + board loads in the background; reveal only when both done (`Promise.all`). No more
  loading flash. Min duration **3 s** (1.2 s felt too quick).
- **Regression from #30/#31 — auto-scroll to the player's row stopped working** (branch
  `fix/game-leaderboard-scroll-to-player`). `mountAfterPlay` renders the board + calls `scrollToMe`
  *while the interstitial hides it* (`#overlay.is-waiting .board { display:none }`). A `display:none`
  element has no layout → `getBoundingClientRect` returns zeros and `scrollTop` won't stick, so the
  jump was lost and the board opened at the top. **Fix:** `scrollToMe` (`core/leaderboard.js`) now
  waits via `rAF` until the list is actually visible (`clientHeight > 0`) before centering the `.me`
  row, with an 8 s deadline (bails if a new round clears the board first). Self-contained in the
  board module; no `game.js` change. `sw.js` CACHE v11→v12.
  - **Regression test (local dev only — deliberately NOT in CI yet)** —
    `tests/e2e/game-leaderboard-scroll.e2e.spec.ts` (Playwright: real browser, since jsdom has no
    layout/rAF). It drives the REAL client module through game.js's endGame→interstitial→revealResult
    sequence and asserts the board jumps to the `.me` row on reveal. Uses a new **generic, reusable
    leaderboard API mock**, `tests/e2e/helpers/mock-leaderboard.ts` (`installLeaderboardMock` — DB-free
    start-token/submit/paged-read; configurable rank/total/board/ties for other leaderboard tests).
    Run manually: `npm run test:e2e -- tests/e2e/game-leaderboard-scroll.e2e.spec.ts`. **No CI
    workflow** — proper/broader test coverage + pipeline wiring are a follow-up before adding to CI.

**OPEN — branch `feat/game-static-backdrop` (PR #32, NOT merged):** optional AI-art underwater
backdrop. Two source images (**ultra-wide ~21:9**, **ultra-tall ~9:21**) + the general encode pipeline
`tools/encode-image.mjs` (PNG → AVIF/WebP/JPEG). The design **evolved** over the session:
- **Model:** field-only cover-fit → "spans the whole viewport" → **final**: one art across field +
  borders, with the **animated boundary markers drawn over it** (kelp-walls / water-surface + boat /
  seabed grass), procedural opaque fills skipped. Reads as one scene; animation marks where play ends.
- **Anchoring saga:** bottom-anchor (seabed grounded) → tried **top-anchor for non-border portrait**
  (cropped the reef, floated the kelp — *rejected*) → **final**: bottom-anchor everywhere, EXCEPT a
  **non-border portrait** gets a small bottom **cut** (`PORTRAIT_BOTTOM_CUT` ~11vh) to drop the dark
  abyss; **bordered (>2:1) portrait + landscape stay flush**. Kelp **grounded at the screen bottom**
  (`bottomExtra`) + longer; **air/sky above the surface** (water↔air separation); surface line dimmed.
- **Look:** dark-green kelp in varied **Stufen** + base→tip gradient + **shimmer** (hue locked green,
  drifts only L/sat — never blue/grey). Full-viewport translucent **depth tint** (`drawWaterGradient`).
- **Perf:** offscreen **backdrop cache** (pixel-identical, no visual change); **FPS check** (`?fps=1`,
  `window.__fps`) — ~100–170 fps in preview, huge headroom; the depth-tint/backdrop cost is
  movement-independent. **No mechanics/control changes** — diff vs `main` doesn't touch
  `core/{sim,input,balance}.js` or `entities/{seal,prey}.js`.
- **Status:** placeholder art replaced with real art; iterating on look. **Before merge:** confirm
  `?fps=1` on a real (low-end/high-DPR) phone; merging auto-deploys to the alpha.

## 6. Prey-icon redesign (branch `feat/game-prey-icons-redesign`, 2026-07-01)

Cosmetic-only pass on the prey art — **kept procedural vector** (decided over PNG sprites: vector
scales at any radius/DPR, recolours freely, no assets, matches the vector seal, and small fast
icons win on silhouette/contrast not detail). The trigger was the new reef backdrop (PR #32): prey
on flat teal read fine, but on the busy AI reef they needed real figure/ground separation.

- **`entities/prey.js`** — `drawFish`/`drawStar`/`drawSquid` reworked: a dark **separation edge**
  (`OUTLINE`, an enlarged ink silhouette behind each creature) + a light **top rim** (pops on both
  bright reef and dark deep water); **vertical counter-shading** gradient (dark back→light belly,
  like the seal); stronger silhouettes (added **dorsal fin**, chunkier star, cleaner squid mantle).
- **Prize fish** — `goldie` (coral scheme) flagged `prize: true`, threaded through `drawPrey` →
  brighter rim + a sparkle so the rare catch stands out.
- **`core/theme.js`** — nudged `PALETTE.fish.teal` greener (separate it from steel/silver) and
  `coral` brighter ("golden" prize).
- **No mechanics touched** — diff doesn't touch `core/{sim,input,balance}.js` spawn/collision or
  `entities/prey.js`'s physics; only the draw functions + the `prize` flag/param. Fairness harness
  unaffected. `sw.js` `CACHE` bumped **v7 → v8**. Verified by rendering the real renderer over both
  backgrounds (species lineup) — clean separation, no syntax errors (`node --check`).

**Swim animation + heading (same branch):** prey now **face where they swim, like the seal** — a
stored `f.ang` yaws toward the velocity in `updatePrey` (`PREY_TURN` rad/s, render-only → still
fairness-neutral) and `drawPrey` rotates the sprite by it. Fin-fish (`round`/`slim`/`eel`) orient
(and roll belly-up when heading left, exactly like the seal — full rotation, no flip, so no
flicker on vertical spawns); **squid & starfish stay upright** (not `+x`-facing). Added a **tail
wag** (fin-fish tail pivots at its base, `anim.tailWag`, backing edge kept aligned through the same
transform) and an **animated squid tentacle wave** (`anim.tentPhase/tentAmp`, travelling wave
across the arms); amplitudes scale with swim effort, all gated by `prefers-reduced-motion`.
Verified with an animated preview of the real renderer (`node --check` clean).

**Belly-down orientation (same branch):**
- Prey now **face their heading WITHOUT rolling belly-up** (dropped the seal-style full roll). In
  `drawPrey`, orientation is a **sticky left/right flip** (`f.face`, hysteresis on `cos(f.ang)` in
  `updatePrey` so near-vertical swims don't flip-flicker) **+ a pitch tilt**:
  `scale(face,1); rotate(atan2(sin ang, face·cos ang))` reproduces the heading with the belly
  always down. Still render-only → fairness-neutral (harness re-run: spread unchanged).
- **Seal — tiny separation edge only.** `entities/seal.js` gets **one purely-additive** change
  (insertions only, 0 deletions): a **thin** dark silhouette of the whole seal (same
  `rgba(12,34,48,0.7)` ink as the prey outline, grow ≈ 3.7%) drawn *behind* every part so he reads
  on the reef — matching the prey's separation edge. No volume/sheen/occlusion; body gradient,
  colours, flippers, tail, claws, whiskers all byte-identical (an earlier volume experiment was
  fully reverted).
- **Open:** real-device look check alongside the PR #32 backdrop before merge.

## Next steps / open items
0. **Backdrop (PR #32) — OPEN.** See §5. Final visual polish + real-device FPS check, then merge.
1. ✅ **Prey decision — DONE.** Straight-in hybrid shipped (PR #26, merged `566f673`), deployed to
   the alpha. `main`'s old random-edge prey (the least-fair model) is replaced.
2. ✅ **Alpha — DONE.** sealthehunter.online auto-deployed from `main` (PR #26) and is live.
3. *(Optional, future)* tighten the residual aspect spread further (tighter clamp — 16:9 is ~2 pts
   fairer but borders tall phones more; or a calibrated per-aspect difficulty compensation) — the
   now-seeded harness can drive it reliably. Also SH-08: anti-cheat + balance from real scores.

> **Local visual testing:** the game is static (`public/games/seal-hunt-v1/`). Serve it over HTTP
> (ES modules + service worker need it) and it can be checked **standalone** and **iframed at any
> width** — the 2:1 clamp/border keys off the canvas/iframe CSS size, so an iframe of a given size
> simulates a screen of that size. (This session used a throwaway static server + an iframe device
> wall; not committed.)
