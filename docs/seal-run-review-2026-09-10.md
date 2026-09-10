# Seal Run — SR review, 2026-09-10

Review of PR #126, including failed CI run
[34425436107](https://github.com/alex-michels/sealife-sealrescue/actions/runs/34425436107).
The unit/integration/coverage job succeeded; the browser job reported **151 passed, 6 failed**.
This review concerns repository implementation. Production rollout is separate.

## Findings and corrections

| Priority | Finding | Correction / evidence |
| --- | --- | --- |
| P1 | The new suite opened the public directory URL. Next's locale proxy redirected it to a localized 404, so six tests never saw the game. | Canonical test entry is `index.html`; exact directory entry redirects there preserving query. A production browser regression exercises that redirect. SW no longer pre-caches the ambiguous directory URL. |
| P1 | A legitimate catch near the front of the seal could fail the server budget after distance was floored to integer metres. | Shared reach slack is seal radius + fish radius + one metre (24 + 12 + 40 = 76 lu). Regression validates actual simulated pickups on early partial runs. |
| P2 | A cover-fit canvas cropped the seal on narrow/tall windows. Location caption used absolute percentage positioning and overlapped route cards. | Separate contained character and content-sized menu grid. RU layout checks cover 1440×900, 1238×1267, 900×1200, 390×844, 320×740 and 844×390. |
| P2 | Phocid tail was absent; hindflippers were angular polygons. | Separate short tail between two curved webbed hindflippers, five foreflipper claws, finer coat/fur and muzzle detail; shared cover/game drawing. Tail separation and torso pixels are tested. |
| P2 | Declared predator body sizes did not guarantee that the rasterized contour contained its collision circle. | Revised visible contours/dimensions, with pixel checks for all six predator variants. Physics and course difficulty remain unchanged. |
| P2 | Weekly start errors persisted after switching to Explore; practice engine errors incorrectly blamed the weekly API. | Clear the error on mode change; separate localized asset-load error. Both paths have browser regressions. |
| P2 | Flat environment art did not meet the requested realistic presentation. | Five separately generated WebP environment plates, small thumbnails, procedural fallback and explicit AI provenance. Prompts and extension contract live beside assets. |
| P2 | A returning player could mix a fresh HTML menu with old cache-first modules during an asset upgrade. | A new bootstrap refreshes an existing worker before importing the controller; fresh visitors still install only after Play. Cache version and complete asset list advance together. |

The revised loader also keeps controls inert until handlers and standalone configuration are ready;
a loading/retry state covers module failures. HUD and touch controls bound the playable canvas,
so no route geometry disappears under interface chrome.

The next CI run (34483875178) reached **160 browser passes**, with two test-only failures:
the CI tsx/esbuild loader injected a name helper into serialized browser callbacks.
Anonymous callbacks and method shorthand remove that hidden bundle dependency.

Manual steering reproduced moving/rotating WebGL quad corruption with an intact source
texture. The seal now stays axis-aligned and swims through articulated flipper frames.
This is consistent with [Phaser issue #7341](https://github.com/phaserjs/phaser/issues/7341),
checked 2026-09-10; the exact internal engine cause is not asserted. WebGL remains enabled.
Initial layout now sizes the parent before Phaser starts and explicitly refreshes its scale
manager when interface bounds change. Real mobile touch input was also exercised. Chapter-specific panorama/prop textures are released on shutdown; the decoded panorama cache is capped at two. The old three large background canvases per chapter have been removed.

## Follow-up from embedded-browser play

Embedded-browser logs identified ReferenceError: EXTRA is not defined in PlayScene.acquire,
triggered when a generated rock_<biome> entered view. The obsolete fallback is removed;
those rocks already receive correct dimensions from the course. The prior short UI fixtures
did not reach this path. New browser coverage sweeps every full 900 m biome in real
Phaser/WebGL, visits actual rocks/hazards and separately plays beyond the first tropical
rocks without page errors.

Static photographic water and sparse motes are replaced in gameplay by five 3:1 panoramas
plus six alpha-preserving generated cutouts. Three independent speed/depth planes, kelp
sway, Phaser TileSprite shimmer and bounded particles make forward travel visible. Tests
check progression, the panorama's right-edge arrival, reduced motion and texture release.
The tail is shorter and has no closed root outline; the eyes are closer to the muzzle.
Four species photographs were inspected and documented in
[the anatomy reference review](seal-run-anatomy-references.md).

## Task-by-task assessment

| Tasks | Repository status and evidence |
| --- | --- |
| SR-01 | Current design/spec defines five chapters, energy, input, scoring and browser/server boundary. |
| SR-02 | Shared deterministic generator, seeded chapter course and hash; Node/browser parity tests. |
| SR-03 | Pure 120 Hz simulation; collision, energy, burst, scoring, timeout and frozen finish tests. |
| SR-04 | Headless linter and cadence bots; reproducible reports, not a claim of human playtest certification. |
| SR-05 | Lazy Phaser renderer with pooled sprites and fixed logical field. |
| SR-06 | Revised articulated seal, separate tail, six predator silhouette checks, generated plates and documented provenance. |
| SR-07 | Responsive menu/HUD, keyboard/touch, modal focus, explicit resume and reduced motion; corrected reported layouts. |
| SR-08 | Seed/embed and RU/EN game instructions present. Existing database content still follows the normal operator seed/update process. |
| SR-09 | Optional score fields, generated types and reviewed additive migration. The migration is prepared, not applied to a live database. |
| SR-10 | Signed per-game token, season/identity pinning, reconstructed per-chapter budgets and derived score; partial-distance regression added. This is plausibility checking, not replay verification. |
| SR-11 | RU/EN, explicit UI preferences only, server-owned weekly best, recoverable errors and offline practice. |
| SR-12 | **Partial:** repository route/embed/vanity redirect code exists. DNS, TLS, enabling public services and verifying live 301 remain operator rollout work. |
| SR-13 | Privacy describes preferences, functional cookie, server score and static cache. German legal text retained. |
| SR-14 | Expanded browser suite covers the reported failures; callbacks also pass locally under the CI tsx loader. The full production CI remains the merge gate. |
| SR-15 | Opt-in synthesized SFX, default mute, gesture-bound AudioContext. |
| SR-16 | Frozen finish and five result/next transitions. Short browser fixture checks UI flow; full-length runs are exercised in simulation. |
| SR-17 | Render-only fish bob, disabled with reduced motion. |
| SR-18 | Rising difficulty floor, recovery sections, 100 templates/260 linted routes; 780 chapter runs. Arctic remains intentionally forgiving. |
| SR-19 | Five local-species chapters with distinct plates/palettes/hazards. Layout registries adapt shared proven patterns; they are not 100 unrelated handcrafted levels. |
| SR-20 | Five fresh-resource chapters, increasing speed, bank/continue and server-derived aggregate results. |

## Release boundaries

No public service, DNS or database migration was activated by this review.
Existing deployment prerequisites remain in [DEPLOYMENT.md](DEPLOYMENT.md).
The interface has keyboard/focus/motion/size checks; no claim of complete nonvisual gameplay
or a full WCAG certification is made. Background plates are illustrative, not biological evidence.

Validation record: the reviewed server CI job passed 689 unit/integration tests with its coverage gate;
local TypeScript and lint pass (16 existing warnings). The original 12 static-preview browser scenarios
pass under both the normal and CI tsx loaders; the thirteenth scenario targets the production
directory redirect. Final full-workflow status is attached to [PR #126](https://github.com/alex-michels/sealife-sealrescue/pull/126/checks).

The current follow-up expands the suite to 17 cases (16 static-preview cases plus the production-only directory redirect). Current results are recorded on the PR checks.

## Follow-up: blank canvas, surface motors and generated predators

Reproduced the user's Antarctic blank screen in the embedded browser: logical canvas
960×540, CSS canvas 0×0, visible stage 1398×973, HUD advancing and no console exception.
The engine's cached parent size survived the hidden menu. The fix measures parent bounds
before fitting on every Play entry. Regression coverage explicitly waits for the hidden
canvas to reach zero size, then checks six consecutive course selections, including two
Antarctic starts on the same engine.

The preceding SR-02/03/19 revision introduced expedition-2 rules for surface motor hazards and deterministic bear
spacing. SR-05/06 include five generated vessel designs with independently animated rotors,
left-facing paddling bears and a separate open-jawed leopard seal cycle. Every predator
frame is checked against its collision circle; missing critical artwork prevents Play and
provides Retry. SR-14 covers that recovery plus full-course rendering with real boat hazards.
SR-12 remains partial pending operator rollout.

Local validation of the surface-hazard revision: 45 Seal Run unit tests (including exhaustive lint/spacing on 260 weekly chapters), 16 browser cases with one production-only skip, TypeScript and lint (0 errors, 16 existing warnings). The 780-run expedition-2 report records finish rates of 80.0%, 83.5% and 85.4% for the three bot profiles. The embedded-browser Antarctic canvas now measures 1398×786.375 CSS pixels and has no console errors.


## Follow-up: player-only drag and full submerged vessels

SR-03/05 now distinguish worldD (current/camera) from d (player distance). Nets create
bounded lag and reduced vertical manoeuvrability; enemies, fish and scenery keep moving.
Hitstun/exhaustion also affect only the player. Registered sprites/collision projection and
bot prediction share those coordinates. Rules version is expedition-3; older signed tickets
cannot silently submit under changed physics.

SR-06/19 replace the clipped stern fragments with five complete submerged hulls and separate
rotors; only the disc costs a life. The renderer retains the long hull after its motor leaves
the viewport. Four region-specific sharks, two orca appearances and an Atlantis grey juvenile
use real-alpha WebP swim frames. Generated files with fake checkerboards were rejected.
All animal frames pass opaque-body hit-circle checks. Mobile proportionally scales the same
optimized files, with no separate mobile-resolution source. Sources/prompts are indexed in
the anatomy review and asset manifest.

SR-18: 780 paired bot runs use the exact old courses. Combined completion changes from
82.95% to 82.69%, with profile changes of −0.77, +0.38 and −0.38 percentage points. This does
not show a large difficulty regression and does not claim equal human difficulty. The
separate new-seed expedition-3 matrix records 78.1/82.3/86.5% completion. SR-12 remains partial
pending operator rollout. This change does not activate public services or apply a database migration.

Local validation for the current/fauna revision: all 46 Seal Run unit contracts passed (including the corrected shared-version endpoint expectation), 16 static browser cases passed with one production-only skip, TypeScript passed, and lint reported 0 errors / 16 existing warnings. Browser assertions cover actual Phaser player drift, continued current, long-hull retention, all generated hit circles/alpha, full 900 m sweeps and six course re-entries. Temporary baseline/preview files were excluded from local lint. The 33 new v4 WebPs total 794,798 bytes.
