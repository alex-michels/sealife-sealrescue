# Seal Run — Ocean expedition (SR-07…SR-20)

Implementation design, 2026-09-10. This replaces the single-biome prototype direction where it conflicts with the earlier v1 design. The simulation remains shared, deterministic ESM; Phaser renders it without a second physics engine.

## Experience

An ocean map with generated environment plates leads to five 900 m chapters: kelp coast, Atlantis, tropical islands, Arctic and Antarctic. The weekly expedition fixes every chapter to a server-signed season and rules version. Finishing a chapter is a success moment: input stops, the seal swims out, then the player chooses whether to continue or bank the expedition. Each chapter begins with three lives and full energy; a small speed increase creates progression without carrying a depleted resource into an unfair opening. Total score is the sum of completed chapters and the final attempt, capped at 500,000. No scores or submissions are stored in localStorage.

Practice lets players choose any location and regenerate a route without a network connection. A relaxed pace option is available in practice. Practice never submits to the weekly board. Ranked mode displays network errors honestly and can fall back to practice only through an explicit choice. Pausing, tab visibility changes and focus loss stop simulation time and clear held input. Retry is immediate; result submission is an explicit action and shows pending/success/error states.

Movement follows the pointer or vertical keyboard input with acceleration and damping. Touch has a broad drag surface plus optional up/down controls; keyboard supports arrows/W/S, Space for an energy-costing burst, and Escape/P for pause. A short guided opening teaches fish, hazards and energy in context. Collision silhouettes and warning markers distinguish predators, entangling debris and solid terrain. Decorative fauna never resemble nearby collidable threats. Motion effects, fish bobbing and parallax respect reduced motion; audio starts muted and is never the sole cue.

## Location art contracts — authored before implementation

| Chapter | Palette and scenery | Playable phocid | Hazard direction |
| --- | --- | --- | --- |
| Kelp coast | Slate-blue water, golden light shafts, layered kelp and stone arches | Harbour seal; spotted coat, compact head | Sharks, orcas, rock channels and lost fishing gear |
| Atlantis | Deep indigo, oxidised copper, illuminated arches, columns and carved stone | Harbour seal; explicitly fictional ruins | Collapsed columns and offset passages; coastal predators |
| Tropical islands | Clear cyan over deep blue, sunlit sand, coral fans and volcanic formations | Hawaiian monk seal; smooth grey/brown coat | Tropical sharks, reefs and gear; no polar wildlife |
| Arctic | Ice-blue light, pale floes, dark under-ice gaps and distant icebergs | Ringed seal; light rings over a dark coat | Surface polar bears and orcas; no penguins or leopard seals |
| Antarctic | Blue-violet water, towering ice shelves and drifting ice | Weddell seal; small head, mottled back and pale belly | Leopard seals and orcas; no polar bears |

The tropical concept uses the living Hawaiian monk seal in its actual region rather than placing it in the Caribbean. Atlantis is labelled fantasy. Chapters are separate encounters with local species, not a story claiming that one seal migrates between both poles. Fish icons represent arcade food classes, not a claim that all depicted prey occur everywhere.

Seal silhouettes have no pinnae or dolphin flukes. The paired hind flippers drive an undulating swimming stroke, with short foreflippers used for steering, a small distinct tail, tapered torso and whisker pads. Species-specific coat patterns and modest head proportions replace the sea-lion-like/cute mascot shorthand. Collision bodies stay inside visible torso silhouettes.

## Technical and verification contracts

- Five biome registries adapt proven traversable patterns and add location-specific layouts. Difficulty has a rising floor as well as a ceiling, with explicitly marked recovery sections after intense patterns. Verify all biomes with chunk lint and the cadence fairness matrix.
- `generateRound(season, roundIndex)` defines the course, biome and speed multiplier once for browser and Node. Versioned signed tokens pin season/course and pseudonymous player identity; server reconstruction bounds each round's distance, catches, fish points, lives, duration and derived score. This is plausibility validation, not proof of a replayed input trace.
- Fullscreen is a user gesture. HTML owns menus, instructions, score, leaderboard, pause, loading and errors. Safe-area padding, visible focus, at least 24 px controls (44–50 px primary/touch controls), scalable text, no forced orientation and independently usable mute/motion settings.
- Phaser remains lazy-loaded on Play. Procedural animals use reusable textures; five 3:1 generated panoramas pan from left to right over chapter distance. Separate transparent kelp, rocks, ruins, reef and ice occupy three depth/speed planes. Phaser TileSprite shimmer and a bounded ParticleEmitter add water movement. Chapter GPU textures are released; decoded panoramas are capped at two. A contained cover character never shares background cropping. Cache only same-origin game assets, never API responses; first offline play requires a completed asset download.
- Browser tests cover keyboard/touch, pause/resume, finish/next chapter, language persistence, offline practice, failure/retry and browser/Node course parity. Endpoint contract tests cover signed course/season, score derivation, per-round budgets, token reuse and Hunter compatibility.
- The canonical Next game route keeps the site's legal footer. A prepared vanity redirect belongs to the existing deployment setup; activating public DNS/services is a separate operator rollout, not a claim of a live deployment.

## Visual follow-up: moving marathon scenery

In play the viewport travels through a 1620-unit panorama (960 units visible), reaching
its right edge at 900 m. There is no looping photographic seam. Independent scenery
recycles beyond the screen at 0.16/0.40/0.72 of world speed; nearer props are larger and
clearer. Kelp sways using scale, avoiding rotating WebGL quads. Scenery never changes
collisions, course hashes, scoring or server validation.

Pause/finish stop scenery and particles. Reduced motion freezes decorative planes and
hides shimmer/motes; gameplay still scrolls. Six-second image deadlines preserve playable
procedural fallback. Versioned local WebP files and their exact prompts are documented in
[assets/README.md](../public/games/seal-run-v1/assets/README.md).

The freeze reported in the embedded browser was a ReferenceError when the first dynamically
named biome rock requested an obsolete texture fallback. Removing that fallback restores
the Phaser loop. A browser regression sweeps all 900 m of each genuine generated biome,
including rocks/hazards, checks layered movement and texture release. A separate ordinary
play test passes the first tropical rocks, where the user encountered the failure.

The shortened tail blends into the rump without a closed root outline; the eye moves
forward and a partial far eye supplies a slight three-quarter muzzle. The four species
were checked against [photographic anatomy references](seal-run-anatomy-references.md).

## Source review

Checked 2026-09-10, high confidence for the limited anatomy/range facts used here:

- [NOAA pinniped anatomy lesson](https://www.fisheries.noaa.gov/s3/2024-09/nfs-mhs-l1-3-afsc.pdf): small tail, phocid foreflippers and hindflipper propulsion.
- [NOAA — harbour seal](https://www.fisheries.noaa.gov/species/harbor-seal): short foreflippers, absent external ear flaps, coat and range.
- [NOAA observer training manual](https://www.fisheries.noaa.gov/s3/2021-07/Southwest-Region-Observer-Program-Training-Manual.pdf): phocid hind-flipper propulsion.
- [NOAA — Hawaiian monk seal](https://www.fisheries.noaa.gov/species/hawaiian-monk-seal): Hawaiian habitat and species appearance.
- [NOAA — ringed seal](https://www.fisheries.noaa.gov/species/ringed-seal): Arctic habitat, coat and polar-bear predation.
- [Australian Antarctic Program — Weddell seal](https://www.antarctica.gov.au/about-antarctica/animals/seals/weddell-seal/): Antarctic habitat, proportions and mottled countershading.
- [Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/xbox/accessibility/guidelines): input choice, difficulty options, object clarity, UI focus and reduced visual distraction. Applied as design guidance; this is not an accessibility certification or a claim that a spatial action game is fully playable without vision.
