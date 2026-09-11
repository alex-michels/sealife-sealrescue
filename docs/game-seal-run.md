# Seal Run — ocean expeditions

Seal Run is a browser-only Phaser 4.2.0 runner at `/games/seal-run-v1/index.html` (the directory entry redirects here), embedded by
`/[locale]/games/seal-run`. RU and EN are the only game languages. The original
coastal prototype is now a five-chapter expedition (SR-07…SR-20).

## Player experience

- **Explore** opens any of five waters, with a new generated route on demand and a default slow, steady
  current (120 lu/s). Optional 35/50/75/100% playback rates retain ordinary accelerations. It works without a leaderboard connection. Runs exist in tab memory.
- **Weekly expedition** obtains a signed server ticket before starting. Everyone swims the
  same five 900 m chapters for that ISO week. Each chapter has three fresh lives and full energy.
- Pointer/drag chooses depth; ↑/↓ or W/S steers. Space spends 18 energy on an 800 ms burst,
  with a four-second cooldown. Touch also has separate up/down and burst buttons.
- Escape/P, the pause button, blur and a hidden tab pause the simulation and clear input.
  Returning to the tab requires an explicit resume. Pauses consume no gameplay time.
- Reaching 900 m freezes simulation, score and input. The seal glides out for 950 ms
  (no exit swim with reduced motion or steady practice; result after 180 ms); the HTML result then offers the next chapter or banking the score.
  Timeout at 150 simulation seconds ends a chapter without awarding completion.
- Weekly results are sent only on the result screen. A failed request can be retried while
  that result remains open. There is no persistent submission queue.

The visual concept and verified biological references are in
[game-seal-run-expedition.md](game-seal-run-expedition.md). Kelp coast uses a harbour seal; fantasy Atlantis a generated chonky young grey seal; Hawaii uses a Hawaiian monk seal; the Arctic a ringed seal; Antarctica
a generated Weddell seal pup. These are separate local encounters. Atlantis is explicitly fictional.
Energy is an arcade resource; fish do not supply breathing air.

## Art and rendering

Three player species use articulated Canvas2D-generated Phaser textures; Atlantis and Antarctica use four-frame generated grey-seal and Weddell-pup atlases. Regional predators use trimmed, padded four-frame WebP atlases; both leopard-seal sizes share one atlas. Five generated 3:1 panoramas
and six transparent scenery cutouts supply the moving game environment; the original five
plates and thumbnails serve the menu/fallback. The 21 original environment WebPs total 1,549,098 bytes; five 1620×540 compact panorama derivatives serve viewports whose shorter side is at most 600px. The desktop variants remain 2172×724.
Missing or slow scenery retains a procedural fallback. Missing collidable-animal or motor art stops loading with a retryable error.
Asset prompts, provenance and extension guidance: [art manifest](../public/games/seal-run-v1/assets/README.md).
`render/expedition.js` provides eight phocid swimming frames, spotted/ringed/monk/Weddell coats,
biome backgrounds and rock/ice, polar bear and leopard seal variants. Paired hindflippers,
a separate short tail, upright near/far webbed feet whose projected breadth changes with the lateral stroke, short foreflippers with claws, small ear openings and no external pinnae distinguish seals from sea lions.
`render/art.js` supplies common fish/debris and legacy texture helpers. `render/hazards.js` supplies the live generated regional fauna and full-length submerged hulls; `core/fauna.js` maps species and registered body origins.

All players see a 960 × 540 logical field, contained inside portrait or landscape screens. The opaque HUD touches the field; status sits below it, and low landscape controls use external side rails. Settings remain available in pause.
The pure fixed-step simulation (120 Hz) owns movement, collision and scoring; Phaser does
not run a second physics engine. Sprites are pooled and simulation positions are interpolated. The hull and rotor are paired pooled images: a static hull and a compact eight-frame rotor atlas keep the same collision origin.
The moving seal stays axis-aligned to avoid a reproduced Phaser 4 WebGL quad corruption;
flipper frames provide its swimming motion (see the SR review for the upstream report).
The cover seal is a separate contained canvas, with its caption in a content-sized grid.
Pixel regressions check player and predator collision circles inside the visible bodies, and scan complete regional predator alpha planes for stray neighbouring-frame fragments.
The shortened tail blends into the rump without a closed root outline; the near eye moves
forward and two visible eyes give every species a softer three-quarter face; generated grey/Weddell use v7 atlases.
[Photographic references for all five playable species](seal-run-anatomy-references.md) record the visual review.
The calm default keeps two faint distant scenery planes (target factors 0.06/0.16), disables particles, shimmer and fish bob, and clears the central tracking corridor. Rich uses three planes (0.16/0.40/0.72), shimmer, kelp sway and at most 36 motes. Decorative speed is smoothed, and switching presets preserves positions. Minimum motion freezes decor and never catches up the missed distance on resume. Fish have 20% larger presentation bounds and a quiet outline; terrain has a continuous rim. Collision/pickup geometry is unchanged.
Chapter panorama/prop/animal/procedural-player GPU textures are released on shutdown; decoded loaders retain only the current chapter assets. Generated players do not allocate procedural game frames. Only common fish, debris, rock-cap and tiny shimmer/mote textures are shared. Obsolete generic predators and background layers are no longer built. In Rich, fish bob by at most 8 lu in rendering only;
pickup coordinates remain unchanged. Reduced motion disables parallax, bobbing and seal
frame animation, and hides shimmer/motes. Pause/finish freeze scenery and particles. Invulnerability uses steady transparency instead of flashing.

The engine is imported only after Play. HTML owns the menu, HUD, instructions, pause, result
and leaderboard. Visible focus, modal focus trapping, safe-area padding and controls at least
24 × 24 CSS pixels cover the surrounding interface. SFX are synthesised locally and muted
by default. A saved sound preference is activated only after a new player gesture.

## Course and balance

`core/chunks/biomes.js` supplies 20 templates per biome: the original 18 coastal patterns,
adapted and mirrored for other waters, plus two authored passages per biome. The registry is
sorted by ASCII id. No random choice occurs in simulation or renderer physics.

The difficulty ceiling reaches 5 at 300 m. A floor rises from 1 to 2 at 300 m and to 3 at
600 m; the guaranteed easy recovery after an intense chunk takes priority. Chapter speed is
`1 + index × 0.035` (1.00…1.14). Burst is optional; the conservative route linter checks
reachability at the fastest chapter speed without requiring burst.

The unchanged bot policy was measured across 52 seeds and three input cadences. In the earlier pre-motor coastal baseline,
finish rates were **78.8%, 80.8%, 84.6%** (81.4% combined). The worst individual
seed has a large cadence spread; the bot is a regression instrument, not proof of equal
human difficulty. The 780 chapter runs are recorded in
[seal-run-expedition-balance.json](seal-run-expedition-balance.json): the current expedition-3 rates are 78.1%, 82.3%, 86.5%.
The separate [paired comparison](seal-run-current-comparison.json) holds the old courses fixed
to isolate the current/drag change: 80.0→79.2%, 83.5→83.8%, 85.4→85.0%.
Arctic surface ambushes make that chapter comparatively forgiving; higher speed does not
imply every biome is harder. All 100 templates and 260 generated routes pass the conservative
reachability, fish-budget and corridor checks.

## Practice presentation clock (SR-23)

Explore defaults to a 120 lu/s steady current. render/motion.js computes the expected next tick speed, including pending burst and fish buffs; the renderer budgets real milliseconds per unchanged 120 Hz simulation tick. Thus resources, collisions and timers stay coherent while real time passes more slowly. 35/50/75/100% rates are also available, adjustable before Play and in pause. Weekly forces rate 1, and server rules remain expedition-3. See [visual comfort review](seal-run-visual-comfort-review.md) for limits and validation.

## Server and storage

`src/games/sealRun.ts` imports the **same** generator used in the browser.
The signed ticket pins game, season, rules version and anonymous player seed.
For each submitted chapter the server rebuilds the course, checks distance/time bounds,
reachable small/rare fish counts, exact score and consecutive completed chapters.
Scores sum to at most 494,500; the request cap is 500,000. Hunter keeps its existing limits.
This is budget/plausibility validation, not replay verification or cheat-proof competitive play.

Starting Weekly creates a signed, HttpOnly, SameSite=Lax `seal_run_player` cookie for seven
days, restricted to `/api/leaderboard` (Secure in production). The server derives a weekly
alias and player key; the personal best lives in Postgres. No email is collected.
Only explicit language/sound/background/tempo choices write `seal_run_lang`, `seal_run_sound`,
`seal_run_background`, `seal_run_tempo` to localStorage. Legacy `seal_run_motion` is read for compatibility. No score, seed or outbox is stored there.

A service worker registers after Play and caches an explicit list of game files.
It never caches API responses or other sites' files. Navigation tries the network first.
Practice remains available offline; scores require a connection. See the additive RU/EN/DE
privacy disclosure in `src/site/legal.ts`.

The additive [SR-09 migration](migrations/SR-09-seal-run-scores.sql) must be reviewed and
applied before deploying against an existing database. Generated Payload types are included.
The earlier M2-T13 review-workflow migration remains a separate deployment prerequisite.

## Development and launch

```sh
node tools/serve-seal-run.mjs
# http://127.0.0.1:4173/games/seal-run-v1/
npm run test:seal-run
node public/games/seal-run-v1/tools/chunk-lint.mjs 52
node public/games/seal-run-v1/tools/expedition-report.mjs
npm run lint
npm run typecheck
```

The static preview never connects to Payload or a database. Its leaderboard intentionally
returns unavailable; practice is fully playable.

The existing generic Next game page and RU/EN seed instructions embed the game.
`deploy/Caddyfile` contains a reviewed-shape 301 vanity redirect block for
`sealrun.sealife.info`, kept commented while the public sites are shut down.
DNS/TLS activation and the live redirect check remain part of the separately authorised
production launch (SR-12). No public deployment is performed by this change.

Surface-hazard follow-up (SR-02/03/05/06/14/19): expedition-2 adds biome-specific generated motors with rotating propellers, spaced swimming polar bears and a distinct generated leopard seal. Course re-entry measures Phaser parent bounds before fitting, fixing the intermittent 0×0 canvas. Contracts, loading failure behaviour and verification are in [game-seal-run-expedition.md](game-seal-run-expedition.md).


## Player-only drag, full hulls and regional fauna (SR-03/05/06/18/19)

The current/camera advances on worldD while player distance is d = worldD − lag. Nets
build up to 96 lu of visible lag and reduce vertical acceleration/speed to 65%; leaving
releases the debuff after 1.8 s and restores position smoothly. Hitstun/exhaustion similarly
lag only the player, capped at 110/64 lu. Fish, obstacles, predators and parallax keep moving.
The same coordinates drive collisions, rendering and bot prediction. Existing fish/burst
pace boosts remain; score and finish use actual player distance. Rules are expedition-3.

All five boats show the entire submerged hull length at the surface. Only the outlined
rotating propeller disc costs a life. The hull, shaft and fittings are decorative.
Culling accounts for the whole hull so it remains visible after the motor leaves the frame.
Atlantic hazard tiers show porbeagle/great white; Hawaii uses Galapagos/tiger sharks.
Northern orcas share a cosmopolitan appearance; Antarctica uses a Type B1-inspired pattern.
These are arcade encounters, not a distribution-density or diet model; see the linked
[reference review](seal-run-anatomy-references.md).

Mobile uses the same optimized WebP files, proportionally scaled with the fixed 960×540
field. There is no mobile-specific download variant. New swim frames are 400×280 RGBA
WebP; lower hulls are 1024×683; panoramas remain 2172×724. The generated grey-seal cover
is contain-fitted separately, including its short tail between the hindflippers.

Image delivery and resource budgets (SR-21): [performance review](seal-run-image-performance.md).
Offline installation caches compact panoramas and live atlases. Larger desktop panoramas
are cached on demand, with compact offline fallback. Logical field, hit radii and simulation
rules do not change with image resolution.
