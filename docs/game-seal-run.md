# Seal Run — ocean expeditions

Seal Run is a browser-only Phaser 4.2.0 runner at `/games/seal-run-v1/index.html` (the directory entry redirects here), embedded by
`/[locale]/games/seal-run`. RU and EN are the only game languages. The original
coastal prototype is now a five-chapter expedition (SR-07…SR-20).

## Player experience

- **Explore** opens any of five waters, with a new generated route on demand and an optional
  gentle pace (80% speed). It works without a leaderboard connection. Runs exist in tab memory.
- **Weekly expedition** obtains a signed server ticket before starting. Everyone swims the
  same five 900 m chapters for that ISO week. Each chapter has three fresh lives and full energy.
- Pointer/drag chooses depth; ↑/↓ or W/S steers. Space spends 18 energy on an 800 ms burst,
  with a four-second cooldown. Touch also has separate up/down and burst buttons.
- Escape/P, the pause button, blur and a hidden tab pause the simulation and clear input.
  Returning to the tab requires an explicit resume. Pauses consume no gameplay time.
- Reaching 900 m freezes simulation, score and input. The seal glides out for 950 ms
  (180 ms with reduced motion); the HTML result then offers the next chapter or banking the score.
  Timeout at 150 seconds ends a chapter without awarding completion.
- Weekly results are sent only on the result screen. A failed request can be retried while
  that result remains open. There is no persistent submission queue.

The visual concept and verified biological references are in
[game-seal-run-expedition.md](game-seal-run-expedition.md). Kelp coast and fantasy Atlantis
use a harbour seal; Hawaii uses a Hawaiian monk seal; the Arctic a ringed seal; Antarctica
a Weddell seal. These are separate local encounters. Atlantis is explicitly fictional.
Energy is an arcade resource; fish do not supply breathing air.

## Art and rendering

Original Canvas2D animals produce Phaser textures at runtime. Five separately generated,
local WebP environment plates supply realistic backgrounds; failed artwork loads retain the
procedural fallback. The ten delivery images (including thumbnails) total 681,228 bytes.
Asset prompts, provenance and extension guidance: [art manifest](../public/games/seal-run-v1/assets/README.md).
`render/expedition.js` provides eight phocid swimming frames, spotted/ringed/monk/Weddell coats,
biome backgrounds and rock/ice, polar bear and leopard seal variants. Paired hindflippers,
a separate short tail, short foreflippers with claws, small ear openings and no external pinnae distinguish seals from sea lions.
`render/art.js` supplies the common fish, orca, shark and debris textures.

All players see a 960 × 540 logical field, contained inside portrait or landscape screens.
The pure fixed-step simulation (120 Hz) owns movement, collision and scoring; Phaser does
not run a second physics engine. Sprites are pooled and simulation positions are interpolated.
The moving seal stays axis-aligned to avoid a reproduced Phaser 4 WebGL quad corruption;
flipper frames provide its swimming motion (see the SR review for the upstream report).
The cover seal is a separate contained canvas, with its caption in a content-sized grid.
Pixel regressions check player and predator collision circles inside the visible bodies.
Two background particle layers scroll at 0.12× and 0.35×. Fish bob by at most 8 lu in rendering only;
pickup coordinates remain unchanged. Reduced motion disables parallax, bobbing and seal
frame animation. Invulnerability uses steady transparency instead of flashing.

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

The unchanged bot policy was measured across 52 seeds and three input cadences:
the coastal baseline finishes **78.8%, 80.8%, 84.6%** (81.4% combined). The worst individual
seed has a large cadence spread; the bot is a regression instrument, not proof of equal
human difficulty. The 780 chapter runs are recorded in
[seal-run-expedition-balance.json](seal-run-expedition-balance.json): 85.8%, 88.8%, 93.8%.
Arctic surface ambushes make that chapter comparatively forgiving; higher speed does not
imply every biome is harder. All 100 templates and 260 generated routes pass the conservative
reachability, fish-budget and corridor checks.

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
Only explicit language/sound/motion choices write `seal_run_lang`, `seal_run_sound`,
`seal_run_motion` to localStorage. No score, seed or outbox is stored there.

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
