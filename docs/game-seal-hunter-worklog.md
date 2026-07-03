# Seal The Hunter — fairness & full-screen rework: work log / handoff

> **Cross-session handoff.** Read this + [`game-seal-hunter.md`](game-seal-hunter.md) (technical
> reference) to get full context with no re-explanation. Game code: `public/games/seal-hunt-v1/`.
> Last updated: **2026-07-03.**

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
- **✅ MERGED — Regression from #30/#31 fixed (PR #34, `89b8b54`, 2026-07-01)** — auto-scroll to the
  player's row stopped working (branch `fix/game-leaderboard-scroll-to-player`). `mountAfterPlay`
  renders the board + calls `scrollToMe`
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

**✅ MERGED — `feat/game-static-backdrop` (PR #32, `81cda3c`, 2026-06-30/07-01):** optional AI-art
underwater backdrop, live on the alpha. Two source images (**ultra-wide ~21:9**, **ultra-tall ~9:21**)
+ the general encode pipeline `tools/encode-image.mjs` (PNG → AVIF/WebP/JPEG). The design **evolved**
over the session:
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
- **Status:** ✅ merged & deployed. Placeholder art replaced with real art (`5b35bb5`); FPS check
  confirmed ~100–170 fps in preview before merge.

## 6. Prey-icon redesign (✅ MERGED — PR #33, `c337a8d`, 2026-07-01)

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
- **Status:** ✅ merged & deployed alongside the PR #32 backdrop.

## 7. Cover art + image consolidation (✅ MERGED — PR #35 + preceding work, `71ae980`/`e0c0ccd`, 2026-07-01)

Landscape (1200×630) + portrait (941×1672, 9:16) cover art re-generated via `encode-image.mjs` →
AVIF/WebP/JPEG (cover 157→69 KB, mobile 300→111 KB); overlay background now serves the same
AVIF→WebP→JPEG ladder via CSS `image-set()` as the backdrop (JPEG-only `cover.jpg` kept for OG, since
some scrapers reject WebP/AVIF). All image assets consolidated under `assets/` (covers joined the
backdrop); `*-src.png` sources git-ignored. Follow-up fix (PR #35, `e0c0ccd`): rebuilt the landscape
cover with a smaller/more compact wordmark so the title isn't cropped on wide monitors
(`background-size: cover` crops width) — same 1200×630 aspect, OG meta unchanged. `sw.js` `CACHE`
bumped v8→v11→v12→**v13**.

## 8. Single leaderboard — desktop/mobile split removed (2026-07-03)

**Decision (owner, 2026-07-03):** one board per game. Seal Run (SR-01 spec §1.2) plays in a fixed
960×540 lu "equal horizon" field — the world is device-independent, so a device split has nothing
to absorb there; Seal Hunter follows for cross-game consistency. The residual portrait-vs-landscape
catch-rate spread of Seal Hunter (single-digit %, bot-measured, see §2/§4 above) now lives inside
one shared board — accepted consciously as the price of consistency; the 2:1 clamp + constant
density keep the main spread bounded.

**What changed (Roadmap SH-11):** `leaderboard.ts` (Zod body, play-token `{g,t,n}`, dedup key
`(game, playerKey, season)`, rank/suffix counts, responses — no `board`); `game-scores` collection
(field dropped, `generate:types`); client `core/leaderboard.js` (no `detectBoard`, no board tabs —
`lbDesktop`/`lbMobile` i18n keys and `.lb-tab` CSS removed, `CACHE` v14→v15); int-tests reworked
(collision-isolation moved from `board=mobile` to a dedicated game slug), e2e leaderboard mock
simplified. Back-compat for the deploy window: legacy `board` in body/URL is ignored, old tokens
with `b` stay valid, and a player's duplicate rows (ex-desktop+mobile) are lazily merged on submit
(max score wins) until the weekly prune.

## 9. Fixed 16:9 / 9:16 play field — SH-12 (2026-07-03)

**Decision (owner):** the play field is now FIXED — 960×540 lu (16:9) landscape, 540×960 (9:16)
portrait. The screen no longer shapes the world at all: every landscape player gets a
byte-identical world, every portrait player too — the full "equal horizon" Seal Run pioneered,
completing the fairness arc (SH-02b constant-short-axis → 2:1 clamp → SH-11 single board → SH-12).

**Measured (seed 0, N=80, 16 profiles):** all landscape profiles 92.2 catch/round (identical),
all portrait 93.0 — **total spread 0.8%**, down from 5.5% under the clamp. The only remaining
axis is the 16:9-field vs 9:16-field shape (+0.9% easier portrait) — accepted consciously on the
single board.

**What changed:** `computeWorld` returns one of two fixed worlds (mechanics/spawn/animations
untouched — the diff is view math only); harness `CLAMP` experiment knob → `ASPECT`;
fairness CI thresholds consciously tightened 15%/10% → **5%/3%** + a fixed-field assert on all
16 profiles; QA-30 golden unchanged (FHD mapped to 960×540 under both models). Border now
appears on ANY non-16:9 screen (16:10/4:3 laptops get seabed+sky strips, portrait tablets get
kelp walls) — `initBorder` already keyed off real ox/oy gaps, no renderer changes needed; worth
one visual pass on a 16:10 display after deploy. `sw.js` CACHE v15→**v16**.

**Rode along (same PR):** RU leaderboard name → **«Доска тюлидеров»** (`lbTitle`, `lbOffline`
in i18n.js) — тюль-сленг per the sealife brand voice; EN/DE unchanged.

**Border matrix (owner review + code check):** gaps land on at most ONE axis (contain-fit of a
fixed-aspect field): landscape wider than 16:9 (21:9/32:9) and portrait wider than 9:16 (3:4
tablets) → **kelp walls** left+right; landscape narrower than 16:9 (16:10/4:3) and portrait
taller than 9:16 (9:19.5/9:21 phones) → **sky+boat strip on top AND seabed strip below**
(`hasTopBottom` draws both). On tall screens the field's own bottom kelp flora sits right above
the seabed strip, so the composition reads as kelp + seabed + surface together — that's field
decor, not the side walls.

**Visual follow-up after owner test (same PR):** keep spawn/play mechanics untouched, but make the
border read correctly in the visible art. `drawPrey` no longer hard-clips to the raw field rect:
side/bottom exits can render into the border with an `EDGE_FADE_LU` alpha falloff before safety-cull.
The side wall is split into static rocks in `drawBorderBack` and animated kelp in
`drawBorderFront`, so both prey and the seal paint behind the left/right kelp walls when they reach
the border. On ultra-tall screens (>9:16) the top border is air, so top-surface prey are **clipped
at the waterline** (`worldY ≥ 0`) and drawn at their **real sim position**, fading out (`EDGE_FADE_LU`)
as they breach with a small ripple marker — they read as diving back under the water rather than
flying into the air, and a fully-breached fish is **not** painted as a solid target below the water
(the field-clamped seal can't reach it; collision tests the real position, so a mirrored phantom
made catches silently fail). Reduced-motion: no ripples. Regression:
`tests/e2e/game-visual-borders.e2e.spec.ts` samples real canvas pixels for side-wall occlusion,
left/right no-clip prey, and top-surface clip (no air pixels, no solid phantom below water).
`sw.js` cache v16→v17. Sim/spawn/cull/catch untouched — fairness and QA-30 golden unaffected.

**Contract lock-in (owner request, same PR):** the current visual/mechanics/fairness state is now
pinned by tests so future changes can't silently regress it. Full inventory:
- *Visual* (`tests/e2e/game-visual-borders.e2e.spec.ts`, **7 контрактов**, real-pixel sampling,
  seeded): (1) side kelp walls repaint OVER seal and prey; (2) prey stay visible beyond
  left/right borders (no hard clip); (3) top surface — no air pixels, no catchable phantom
  below water; (4) **border matrix per orientation** — 16:10 и 9:19.5 → светлое небо сверху И
  дно снизу (и ноль боковых зазоров), 3:4-планшет и 21:9 → стены водорослей с обеих сторон
  (и ноль верх/низ); (5) полевые водоросли ПОВЕРХ фона, но ПОД добычей (порядок слоёв
  пиксельно); (6) **фейд по вылету за край** — внутри поля полная плотность, на 30 lu ~21%,
  на 39 lu (за `EDGE_FADE_LU` 38) ноль → кулл невидим; (7) **рябь «флоп-плюх»** у ватерлинии —
  дифференциально (ripples:true добавляет кольцо поверх той же сцены; хвост прорвавшейся рыбы
  легитимно остаётся в воде — это желанный look, закреплён).
- *Mechanics* (`tests/unit/seal-hunt-prey-edges.unit.spec.ts`, **6 контрактов**, детерминированно):
  спавн — 4-edge shuffle-bag (первые 4 спавна = все 4 края), позиция ровно ±20 за краем,
  скорость строго внутрь; edge-push возвращает рыбу с ВСЕХ 4 сторон (за 3 с крейсерская рыба
  никогда не доходит до кулл-порога ±40 и возвращается в поле); safety-cull — −39 живёт,
  −45/NaN удаляются. Вместе с QA-30 golden (трасса физики/спавна/счёта) и QA-31
  (фикс-поле 960×540/540×960 на всех 16 профилях, спред ≤5%, девиация ≤3%) — полный
  контрактный замок текущего состояния. Не покрыто сознательно: resize()-проводка game.js
  (те же формулы, что в фикстурах; тонкий слой) и i18n-строки.

## 10. ⚡ Lightning sea star — SH-13 (2026-07-03)

Owner-updated spec: the VERY RARE lightning star now gives **5 points** (was 1 in the backlog
text) and plays a **magic "воаля" sound** (rising triangle arpeggio C6-E6-G6-C7 + a sine
bell-shimmer gliss E7→C8 — deliberately unlike the ordinary catch pop) — "some magic happened".
Best-practice pass (searched): distinctive glowing pickup, multi-channel collect feedback,
VISIBLE buff duration (golden aura ring with rotating sparks on the seal while ×2 speed runs,
fading with the remaining time), rarity kept low so the delight stays special.

Engineering: schedule is round-scoped and consumes exactly **4 RNG rolls regardless of outcome**
(stream position stable → golden/fairness stay f(seed)); spawn runs inside `spawnTick` so game
and harness share one path; the star is `still` (doesn't flee — a reward, not prey-chase);
buff lives in `stepSeal` (`seal.buffT`, speed AND accel ×2, self-decaying); `eatCb(f)` now passes
the caught prey (points = `sp.points || 1`). Golden regenerated consciously (92 pts for the
seeded FHD round; RNG stream shifted by the 4 schedule rolls). Fairness N=80: spread **0.4%**
(star is orientation-fair under CRN). Server plausibility caps untouched (+4 pts max ≪ cap
headroom). Contracts: `tests/unit/seal-hunt-star.unit.spec.ts` (8) + e2e
`game-lightning-star.e2e.spec.ts` (halo/brightness/expiry-fade, real-pixel). `sw.js` v17→**v18**.

**Owner playtest tweak (same day):** buff duration **2 s → 3 s** (`STAR.buffSec`) — 2 s faded too
fast to enjoy. Golden unchanged (the seeded round has no star; tests read `buffSec` dynamically);
fairness N=80 re-measured: 94.0 / 94.2, spread **0.2%**. `sw.js` v18→**v19**.

## Next steps / open items
1. ✅ **Prey decision — DONE.** Straight-in hybrid shipped (PR #26, merged `566f673`), deployed to
   the alpha. `main`'s old random-edge prey (the least-fair model) is replaced.
2. ✅ **Alpha — DONE.** sealthehunter.online auto-deployed from `main` (PR #26) and is live.
3. ✅ **Backdrop (PR #32), prey-icon redesign (PR #33), leaderboard-scroll fix (PR #34), cover
   rebuild (PR #35) — all DONE**, merged and deployed to the alpha as of 2026-07-01.
4. **Open — SH-10 (Roadmap):** legal-page accessibility on the alpha domain (footer Impressum/
   Datenschutz links in-game, Caddyfile allowlist, real Impressum contact info, Datenschutz section
   about the game's `localStorage`/rate-limiting) — confirmed still not started by the 2026-07-01
   documentation audit.
5. *(Optional, future)* tighten the residual aspect spread further (tighter clamp — 16:9 is ~2 pts
   fairer but borders tall phones more; or a calibrated per-aspect difficulty compensation) — the
   now-seeded harness can drive it reliably. Also SH-08: anti-cheat + balance from real scores.

> **Local visual testing:** the game is static (`public/games/seal-hunt-v1/`). Serve it over HTTP
> (ES modules + service worker need it) and it can be checked **standalone** and **iframed at any
> width** — the 2:1 clamp/border keys off the canvas/iframe CSS size, so an iframe of a given size
> simulates a screen of that size. (This session used a throwaway static server + an iframe device
> wall; not committed.)
