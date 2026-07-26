# sealgames.online — browser game portal ideas

Status: brainstorm / product design notes. Last updated: 2026-07-03.

`sealgames.online` can be a third public surface: a cozy browser arcade for seal fans, with mini-games,
quizzes, meme creation, seasonal challenges and account-based collections. The portal should feel more
like a recurring community ritual than a pile of isolated games: "play one short thing, learn one seal
thing, bring one friend/pod back tomorrow."

## Non-negotiables from the current project

- No violence, gore or cruelty. Predators, storms, trash and nets can exist as avoidable obstacles, but
  the seal is never hurt in a graphic way and the tone stays affectionate.
- No public-user email collection in MVP. Current leaderboards are anonymous/pseudonymous; durable
  cross-device achievements require the future ACC account epic and updated Terms/Datenschutz.
- UGC, including memes/captions, stays premoderated. No public auto-publish.
- Real rescue information is not a toy mechanic. Rescue-themed games can teach general safe behavior
  and link to sealrescue, but must not present unverified contacts or emergency data as game facts.
- Current domain policy (owner decision, 2026-07-26): the project runs exactly two public root domains,
  `sealife.info` and `sealrescue.info`, plus their subdomains. A portal on its own root domain stays an
  idea here — shipping it would need an explicit policy change; the friction-free version is a
  `games.sealife.info` subdomain.
- If a portal ever does get a separate root domain, it needs its own footer/legal accessibility from day
  one: Impressum/legal notice, privacy, cookies/settings, terms, language switcher, and account/SSO
  handling if accounts exist. The retired public game alpha is the cautionary tale: it shipped as a
  standalone origin whose Impressum/Datenschutz stayed unreachable for its whole life (SH-10).
- "Seal points" must not become gambling value: no cash-out, no real-money spins, no purchasable power,
  no paid loot boxes, no prize with economic value.

## Portal positioning

Working tagline ideas:

- "Tiny seal games. Big flipper energy."
- "Daily games, quizzes and memes for seal people."
- "Поиграл, тюльнулся, вернулся завтра."
- "Your daily haul-out for seal games."

Product promise:

- Short sessions: 30 seconds to 3 minutes, strong "one more round" energy.
- Friendly mastery: players improve, collect, compare and cooperate without toxic pressure.
- Seal-first identity: avatars, badges, stamps, fish journals, meme frames, pod names.
- Content loop: games feed quizzes, quizzes feed facts, facts feed memes, memes feed sharing.
- Community loop: weekly pod goals and global meters make small actions feel collective.

## Best-practice takeaways

- Browser games should stay standards-native where possible: current static games in
  `public/games/<slug>-vN/`, iframe embeds, lazy-loaded heavier engines, versioned assets and SW cache
  discipline are the right pattern. MDN frames web games as regular HTML/CSS/JS distributed through the
  open web, not app-store-locked packages.
- Canvas games need measured performance. Keep the existing practice of DOM-free sim cores, seeded
  harnesses and real-browser visual checks. For Canvas2D, pre-render expensive repeated art on snug
  off-screen canvases, batch draw calls and avoid heavy state changes/text rendering per frame.
- WCAG 2.2 AA applies to the portal shell and game UI: visible focus, target size >= 24 CSS px,
  keyboard/no-trap paths, no essential meaning by color alone, no essential sound-only cues, pause or
  motion reduction where relevant.
- Game Accessibility Guidelines map well to this project: adjustable speed/sensitivity where feasible,
  large touch controls, simple language, interactive tutorial, high contrast, remappable/simple inputs,
  separate audio controls, reduced background motion and a broad difficulty choice.
- Achievements work best as a mixture of milestone, progress and surprise. Google Play Games guidance
  recommends incremental achievements with visible progress; use that idea even if the implementation is
  first-party.
- Leaderboards serve two audiences: hardcore top-rank players and casual "how did I do vs friends/pod?"
  players. Keep public weekly leaderboards, but add personal-best graphs, percentile, pod boards and
  friend boards when accounts exist.
- Retention research on online multiplayer found achievement features matter earlier in a player's life,
  while social features become more predictive later. Translation for this portal: start with visible
  badges and daily missions; graduate loyal players into pods, co-op goals and creative events.

## Engagement loops

### Daily loop

1. Daily Tide: one seeded mini-game challenge shared by everyone.
2. Daily Whisker Quiz: 3 to 5 questions; perfect run gives a small badge tick.
3. Daily Meme Prompt: one caption/template prompt; submissions are private until moderated.
4. Daily Pod Task: "as a pod, collect 500 fish / answer 80 quiz questions / react to 20 memes."
5. Daily Reward: seal points + progress toward a cosmetic stamp, not raw power.

### Weekly loop

- Weekly leaderboard season, already aligned with `game-scores`.
- Weekly biome theme: Baltic fog, Arctic ice, kelp forest, harbor night, research boat day.
- Weekly community meter: fill a safe haul-out, clean a cartoon beach, light a buoy chain.
- Weekly meme cup: moderated finalist board with reactions.
- Weekly quiz/victorina cup: knowledge leaderboard with category badges.

### Monthly loop

- Migration Season: 4 weekly chapters, each with a shared cosmetic unlock.
- New mini-game prototype or remix mode.
- Community "seal album" page: best moderated memes, top pod contributions, most helpful quiz facts.

### Account loop, future ACC phase

The portal account fantasy should be "Seal Passport", not "social network":

- Public field: username only.
- Private fields: email/session only if ACC is implemented under Terms/Datenschutz.
- Collections: badges, stamps, species cards, fish journal, meme frames, avatar cosmetics.
- Cross-game achievements: skill, knowledge, kindness, creativity, consistency, exploration,
  collaboration.
- Pods: small opt-in groups with no free chat at first; use preset emotes/phrases and contribution
  meters to reduce moderation load.

Before ACC, keep progress intentionally lightweight: anonymous weekly boards, local UI preferences after
explicit action, share cards and short-lived weekly badges. Long-term durable achievements need a server
account source of truth.

## Strongest game bets

| Idea | Why it fits | Return mechanic | Complexity |
| --- | --- | --- | --- |
| Seal The Hunter: Daily Tide | Uses the strongest existing game and its fairness harness | Daily seeded challenge, missions, weekly board, pod catch meter | Low/medium |
| Tide Tumbler | Your "seal slots" idea, but framed as luck + timing arcade, not gambling | Daily free tumbles, collectible symbols, pod jackpot meter | Medium |
| Whisker Quiz Cup | Easy to produce from existing content; strong community identity | Daily quiz, weekly category cup, knowledge badges | Low |
| Meme Buoy Maker | Uses the meme/community strength of seal fans | Weekly prompts, moderated finalists, share cards, frame unlocks | Medium |
| Haul-Out Haven | Cooperative idle-lite "build a safe resting beach" | Global/pod construction goals, seasonal decorations | Medium/high |
| Seal Run: Weekly Migration | Builds on existing Phaser/seeded-course work | Weekly fixed course, distance board, route stamps | Medium |
| Pup Patrol: Beach Rules | Connects sealife fun to sealrescue education safely | Scenario badges, "what to do" mastery, rescue link | Low/medium |
| Guess The Seal | Uses species content and visual assets | Daily silhouette/whisker challenge, species album | Low |
| Seal Pup Odyssey / First Tide | Flagship seal life sim: survival, exploration, quests, map unlocks | Life stages, daily tides, zone quests, seasonal events | High |

## Flagship long-arc concept: Seal Pup Odyssey / First Tide

Pitch: an online virtual open world of seals and seal adventures: **2D/2.5D seal life sim + gentle
survival + exploration RPG**. The player starts as a pup in a safe nursery bay. After the mother leaves,
the pup begins its first independent tide: catching fish, learning breathing/rest rhythms, avoiding
danger, finding haul-outs, meeting other seals, unlocking coasts and ocean zones, and completing
quests that teach real seal ecology without becoming a school worksheet.

This should be the portal's "big world" game, not a quick daily arcade. It can still live in the browser
if scoped as **zone-based open world** instead of one giant seamless MMO ocean. Each zone is a loaded
map with exits, fast-travel buoys, quests and local events. The online layer can start asynchronous:
daily tides, shared community goals, leaderboards, pod contributions and account-backed progress later.
Live multiplayer chat/MMO behavior is a later product, legal and moderation step.

### Game fantasy

- You are not "a generic animal." You are a specific young seal with a growing map, memory, scars,
  favorite resting spots and a journal of discovered species.
- The emotional arc is "from pup to capable ocean wanderer": mother-tutorial -> first solo fish ->
  first storm -> first migration -> first return to the old bay.
- The game is cozy but not empty. Survival gives texture: hunger, breath, fatigue, cold, noise and
  confidence. Failure is soft: washed back to a safe beach, lost energy, quest reset, no gore.
- Nature is not an enemy list. Predators, boats, nets and trash create tension, but the design focuses
  on awareness, escape, rest and recovery.

### World structure

- Nursery Bay: tutorial, mother, shallow water, first fish, first resting rock.
- Kelp Forest: maze-like cover, small fish, hidden collectibles, calm exploration.
- Harbor Edge: noise, boats, human objects, rescue education, stealth/avoidance quests.
- Open Sea: currents, migration, stamina/breath mastery, rare fish schools.
- Storm Coast: weather events, timing, safe haul-out search.
- Ice Edge / Northern Water: cold management, breathing holes, seasonal route.
- Rescue-risk Beach: general "what humans should do" learning through observation, not local contact data.

Maps unlock through quests, age milestones and discovered route markers. The player can revisit old zones
for daily events, collectibles and seasonal changes.

### Core loop

1. Explore a zone.
2. Catch fish and manage breath/fatigue.
3. Rest on a safe haul-out.
4. Complete one small quest or discovery.
5. Unlock a map fragment, ability, cosmetic or journal entry.
6. Return later for a daily tide, seasonal event or pod/community goal.

### Progression

- Life stages: pup -> juvenile -> adult. Each stage changes speed, breath capacity, map access and
  available quests.
- Abilities: deeper dive, current reading, kelp hiding, long-rest recovery, storm sense, fish-school
  tracking.
- Collections: route stamps, species sightings, fish journal, shell/pebble keepsakes, old-bay memories.
- Personalization: coat markings, whisker charm, resting pose, postcard frames. Cosmetic-only.

### Survival systems

- Hunger: restored by fish; low hunger slows recovery.
- Breath: depletes under water, restored at surface/haul-out; never a hidden timer.
- Fatigue: swimming and stress drain it; resting matters.
- Warmth/cold: zone-specific, mostly in ice/storm zones.
- Confidence: a soft tutorial/helper stat; drops after scares, recovers through safe actions and rest.

All systems must have clear UI, readable icons, reduced-motion support and a relaxed mode. No essential
information should be audio-only or color-only.

### Quest and event examples

- First Tide: follow mother, catch 3 fish, surface to breathe, rest safely.
- The Quiet Rock: find a haul-out away from dogs and humans.
- Kelp Shortcut: learn to hide in kelp while a boat passes.
- Silver School: follow a fish school without exhausting yourself.
- Storm Warning: reach shelter before waves close a route.
- Lost Pup Echo: guide another pup with calls and route markers, no combat.
- Plastic Loop: escape debris, then contribute to the weekly clean-beach community meter.
- Old Bay Return: as an adult, revisit the nursery and unlock a memory stamp.

### Online/social model

- V1: single-player world with server-authored daily/weekly events.
- V1.5: asynchronous pods: "our pod mapped 70% of Kelp Forest this week", shared postcards, community
  beach meters.
- Future ACC: account-backed world save, achievements, cosmetics, pod membership and cross-device play.
- Later only if worth the moderation cost: limited visible ghosts, preset emotes, no free chat by default.

### Browser feasibility

Feasible paths:

- **2D top-down Phaser**: best first build. Similar pipeline to Seal Run; maps are tile/shape layers,
  movement is readable, assets are manageable, mobile controls are simple.
- **2.5D Canvas/WebGL**: richer water depth and parallax while keeping authored 2D maps.
- **3D WebGL** with Three.js/Babylon.js/PlayCanvas: possible, but much higher art, animation,
  performance and QA cost. Better as a later prototype after the game proves its loop.

Recommended MVP: Phaser 2D/2.5D, one zone, one life stage, 10-15 minutes of story, no account required.

### MVP slice

- Title: `First Tide`.
- Map: Nursery Bay.
- Characters: player pup, mother, 2 ambient seals, fish school, boat shadow, gulls as ambience.
- Mechanics: swim, surface, catch fish, rest, simple current, soft danger warning.
- Quests: mother tutorial, first solo fish, quiet resting rock, return-home beat.
- Progress: local session save only or anonymous server save if a challenge/event needs it.
- Success moment: "You survived your first tide" + map fragment for Kelp Forest.

### Risks and guardrails

- Do not start with seamless multiplayer. It multiplies moderation, performance, account and anti-cheat
  work before the core is proven.
- Do not make starvation/predation harsh; seal fans want care, wonder and tension, not trauma.
- Do not use rescue-center contacts as quest data. Keep rescue learning generic and link to verified
  sealrescue pages.
- Do not make the world too empty. A small dense bay beats a huge empty ocean.
- Keep durable progression server-authoritative once accounts exist; localStorage is not the source of
  truth for long-term world saves.

## Game concepts

### 1. Seal The Hunter: Tide Rush

Existing core: catch fish in 60 seconds. New hook: the sea changes every day.

- Daily Tide mode: same visual tide and mission set for everyone each day. Examples: "foggy kelp",
  "goldie migration", "star-watch night", "tiny fish swarm".
- Mission cards: catch 3 goldies, take a lightning star, finish with no missed star, catch every fish
  family, beat your previous percentile.
- Collection: fish journal with non-PII progress after ACC; before ACC, show session/weekly progress only.
- Community: every fish caught contributes to the weekly reef meter. Unlock a shared meme frame or
  backdrop variant when the meter fills.
- Pod play: pod catch total, pod average, and "best helper" badges based on contributions, not only score.
- Share: "I caught 94 fish for the Foggy Kelp Tide" OG card with alias and rank.
- Safety: keep existing play-token, score caps, weekly pruning, single board and real fairness harness.

### 2. Tide Tumbler / Flipper Slots

This is the "Seal Slots" idea, but safer as a skill-luck arcade toy.

Core:

- Reels show seal-world symbols: herring, goldie, lightning star, clam, buoy, kelp, pebble, moon tide,
  sleepy pup, research tag.
- Player gets one skill input per spin: freeze a reel, nudge one symbol, or time the dive at the crest
  of a wave for a small odds modifier.
- Choices matter: shallow tide is steady; deep tide has rare symbols but more kelp blockers; moon tide
  is high variance.
- Combos unlock mini-events, not cash-like prizes: "3 buoys lights the harbor", "star + fish starts
  a 10-second catch rush", "clam opens a quiz pearl."

Retention:

- One free Daily Tumble seed for everyone.
- Weekly symbol album: complete a set for a stamp.
- Pod jackpot meter: each player contributes symbols; if the pod completes the reef pattern, everyone
  gets a cosmetic frame.

Compliance guardrails:

- Avoid public "casino" framing, paid spins, real-money purchase of spins, exchangeable prizes, loss
  pressure, near-miss manipulation or odds-dark-patterns.
- Seal points earned here are capped and cosmetic-only.
- Prefer names like `Tide Tumbler`, `Pebble Reels`, or `Flipper Fortune` over "slots" in public UI,
  especially for DE/EU audiences.

### 3. Whisker Quiz Cup / Викторина "Усы знают"

Fast quizzes with charm.

- Modes: Daily 5, Species Sprint, Myth or Fact, Rescue Basics, Meme Lore.
- Scoring: speed is secondary; correctness and streaks matter more, so it feels welcoming.
- Return: daily perfect stamp, weekly category cup, "species professor" badges.
- Social: pod average and "everyone answer one question" goals.
- Content: every answer can link to a sealife article/species page.

### 4. Meme Buoy Maker

A simple meme/caption creator that keeps UGC safe.

- Players choose approved seal images/templates, add caption, sticker, frame.
- Weekly prompt: "Monday mood seal", "when the fish is one pixel away", "seal rescue PSA but cute."
- Moderation queue before public display.
- Rewards: creator badges, featured frame, pod reaction meter.
- Sharing: downloadable/shareable card after moderation; private preview before moderation.

### 5. Haul-Out Haven

Cooperative idle-lite construction: the community builds a safe, cozy cartoon haul-out.

- Players earn pebbles/kelp/buoys from games and quizzes.
- Contribute resources to global or pod beach projects.
- Projects are educational but not emergency data: distance signs, quiet zone ropes, clean beach,
  observation platform, rescue-info kiosk.
- Weekly reset with a new biome and decoration set.
- Great for players who are not top-score arcade people.

### 6. Seal Run: Weekly Migration

Current Seal Run can become the "serious skill game" of the portal.

- One fixed weekly route per season, already aligned with seeded-course docs.
- Daily route modifiers that are cosmetic or separately scored: fog, night, kelp bloom.
- Collect route stamps for finishing milestones, not only top distance.
- Pod goal: collectively swim enough meters to "reach the next bay."
- Add ghost replay later: compare to your best run or a friend's route without live multiplayer.

### 7. Pup Patrol: Beach Rules

Non-violent rescue education game.

- Scenario cards: "you found a resting seal", "dog nearby", "crowd gathering", "injured-looking animal."
- Player chooses safe actions: keep distance, leash dog, call official help, do not pour water, do not
  push animal back.
- Use generic safety instructions and link to sealrescue; do not invent local center contacts.
- Rewards: "calm helper" badges and rescue-literacy quiz progress.
- Tone: gentle public-safety utility, not slapstick.

### 8. Guess The Seal

Species recognition daily puzzle.

- Guess by silhouette, whisker close-up, coat pattern, range map, "which fact belongs to this species?"
- Uses species collection content and encourages reading.
- Daily streak with forgiveness tokens; species album fills over time.
- Social: compare "today's guess distribution" after answering.

### 9. Pebble Curling

Physics microgame: slide pebbles toward a tide target.

- One-button/touch drag power, short rounds, very shareable.
- Daily target layout; weekly board by best 3 throws.
- Pod mode: everyone throws one pebble into a shared board.

### 10. Kelp Maze

Calm maze navigation.

- Guide the seal through moving kelp gates, collect bubbles and avoid trash.
- Modes: relaxed no-timer, daily timed maze, puzzle-of-the-week.
- Accessibility: adjustable speed, no tight twitch path as the only way to win.

### 11. Bubble Choir

Rhythm/memory game without violence.

- Repeat seal-call bubble patterns; bubbles light up with symbols and audio.
- No essential audio-only cue: every note has shape/color/motion.
- Social: pod choir fills a weekly melody; players contribute one phrase.

### 12. Ice Floe Ferry

Grid puzzle: move a pup safely across floes.

- Slide/rotate floes, avoid cracks, collect fish.
- Daily puzzle, hint system, no timer by default.
- Great for knowledge/logic players.

### 13. Krill Drift

One-thumb drifting game.

- The seal rides a current, collecting krill clouds and bubble boosts.
- Emphasis on flow and elegance, not collision punishment.
- Weekly trick challenges: longest smooth chain, fewest bumps.

### 14. Whisker Detective

Hidden-object game.

- Find seal-related objects in a foggy coastal scene: tags, fish, buoy, rescue sign, camera, pebble.
- Daily scene with educational micro-facts.
- Meme tie-in: found objects become stickers in Meme Buoy Maker.

### 15. Sandbank Sudoku / Pebble Patterns

Logic puzzle family.

- Sudoku-like pebbles, nonograms that reveal seals, match-3-ish puzzle with no lives monetization.
- Daily puzzle can be very sticky for older/community players.

### 16. Flipper Postcards

Creative low-pressure game.

- Compose a postcard from stamps unlocked in other games.
- Weekly prompt and moderated gallery.
- Strong for social sharing without requiring comments/chat.

### 17. Seal Chef: Fish Picnic

Pattern/recipe game.

- Prepare a "seal picnic" by sorting fish icons into silly but harmless combinations.
- Timed arcade and relaxed mode.
- Achievements for discovering recipes; quiz facts about diet.

### 18. Tide Weather Oracle

Luck + knowledge daily predictor.

- Guess today's tide mood from three clues; then play a tiny outcome animation.
- Uses real-ish educational snippets but not real-time local data unless verified and sourced.
- Rewards a tiny daily ritual, not a heavy game.

### 19. Pod Relay

Asynchronous co-op across games.

- Player A starts a relay by playing Hunter, Player B adds a quiz answer, Player C adds a meme reaction,
  Player D plays Run.
- The relay produces a shared "pod postcard" when complete.
- No live multiplayer, low infra and moderation risk.

### 20. Harbor Lights

Co-op puzzle event.

- Every completed daily task lights one buoy on a shared map.
- When the community lights a route, a new backdrop/meme template unlocks for the week.
- Good "come back tonight" feeling without push notifications.

## Existing Seal The Hunter upgrade backlog

High-impact additions:

1. Daily Tide challenge with a shared seed and a separate daily board.
2. Mission drawer on game-over: today's mission, weekly mission, pod mission.
3. Achievement toasts after the existing interstitial, with reduced-motion variants.
4. Fish journal and symbol collection, account-backed later.
5. Community reef meter fed by all submitted scores.
6. Pod totals and friend/pod boards after ACC.
7. Ghost/best-run overlay later, if deterministic replay data is small and privacy-safe.
8. Cosmetic tide themes unlocked by weekly participation, never by paid power.
9. Better "one more round" final screen: next mission, daily tide, quiz link, meme prompt.
10. Gentle rename test for portal copy: keep slug/title if desired, but describe it as "fish-catch
    arcade" so non-violent positioning is obvious.

Balance-safe mechanics to test with the harness:

- Combo rings: fast consecutive catches add score flavor, but cap total score plausibility.
- Rare shoal: short swarm event with deterministic schedule, like lightning star RNG discipline.
- Tide currents: visual-only first; mechanical current only if fairness stays stable.
- Star variants: speed star, magnet bubble, calm kelp shield; each consumes fixed RNG and has a server
  cap story.

## Portal systems

### Seal Points

- Earned from games, quizzes, daily tasks, pod contributions and moderated creative participation.
- Cosmetic-only: profile frames, stamps, avatar items, postcard assets, backdrop variants.
- Capped per day per activity to avoid grind and anti-cheat pressure.
- Not purchasable until legal/monetization work exists, and even then avoid pay-to-win or spin purchase.

### Achievements

Types:

- Standard: "Catch your first lightning star."
- Incremental: "Catch 1,000 fish across seasons."
- Hidden: "Find the sleeping seal in the fog."
- Seasonal: "Baltic Fog Week participant."
- Cooperative: "Help your pod finish a buoy chain."
- Knowledge: "Answer 50 species questions correctly."
- Creativity: "Submit 5 memes that pass moderation."

Design rules:

- Show progress bars for incremental achievements.
- Give early achievements within the first 10 minutes.
- Keep surprise achievements delightful, not required for completionists.
- Never require unsafe behavior, public spam or unmoderated posting.

### Pods

Pods should be cooperation without building a full social network:

- 3 to 20 members.
- Join by invite code.
- No free chat in v1; use preset emotes and short localized phrases.
- Pod board, pod goals, pod postcards, pod streak.
- Moderation/reporting before any free-text names or descriptions become public.

### Meme/social sharing

- Share cards should be OG-friendly and platform-neutral.
- No tracking pixels or third-party scripts for share mechanics.
- Public galleries only after moderation.
- Reactions can remain anonymous, rate-limited and server-backed.

## Technical implications

Near-term, no accounts:

- Add daily/weekly challenge metadata around existing `games` and `game-scores`.
- Reuse `/api/leaderboard/start`, `/api/leaderboard`, weekly seasons and anonymous aliases.
- For challenge boards, consider `challengeId` or a separate `game-challenges` collection before
  overloading `season`.
- Keep all durable state server-authoritative. `localStorage` only mirrors explicit UI choices or
  anonymous seed-style identifiers already documented.

Future ACC/account phase:

- Add `players`, `player-achievements`, `player-inventory`, `portal-events`, `pods`,
  `pod-memberships`, `pod-contributions`.
- Update Terms, Datenschutz, Art. 30/DPA register and account deletion/export flows.
- SSO/domain decision: `sealgames.online` as a separate root domain needs OIDC-style login via the
  central account host; a `games.sealife.info` subdomain is simpler for cookies/legal consistency.
- Add moderation collections for meme submissions, reports, decisions and appeals if UGC expands.

Game implementation standards:

- Every game gets: `i18n.js`, accessible HTML instructions/result outside canvas, reduced-motion path,
  service worker cache versioning if offline-capable, real-browser smoke/e2e, and a docs page.
- Skill/score games get: DOM-free sim core or deterministic rules module, seeded harness, anti-cheat
  plausibility plan, play-token integration and fairness notes.
- Heavy games use Phaser/Three only when the core interaction justifies it; microgames can stay vanilla
  Canvas2D/SVG/DOM.

## Suggested first roadmap slice

1. Make a "portal mode" design doc/route under sealife first, before committing to separate
   `sealgames.online` infrastructure.
2. Add Daily Tide to Seal The Hunter.
3. Add Whisker Quiz Cup and daily quiz scoring.
4. Add a server-backed challenge/event model.
5. Add cosmetic-only Seal Points for anonymous weekly participation, with no long-term claims.
6. Build Tide Tumbler as the first new luck+skill microgame.
7. Build Meme Buoy Maker with moderation-only publishing.
8. Prototype `First Tide` as a one-zone 2D/2.5D seal life sim vertical slice.
9. Move to account-backed Seal Passport only after ACC legal/security work is ready.

## Sources consulted

- Project docs: `game-seal-hunter.md`, `game-seal-run.md`, `Roadmap.md`, `data-model.md`,
  `COMPLIANCE_EU_DE.md`, `DESIGN_BRIEF.md`, `api.md`.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) for target size, focus, motion, color, keyboard and
  timing requirements.
- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/) for practical
  game-specific accessibility patterns.
- [MDN Game development](https://developer.mozilla.org/en-US/docs/Games) for web game platform framing.
- [web.dev Canvas performance](https://web.dev/articles/canvas-performance) for off-screen canvas,
  batching and draw-state performance notes.
- [Google Play Games achievements](https://developer.android.com/games/pgs/achievements) for
  achievement taxonomy and incremental-progress guidance.
- [Google Play Games leaderboards](https://developer.android.com/games/pgs/leaderboards) for daily,
  weekly, all-time and social/public leaderboard patterns.
- [Park et al., "Achievement and Friends"](https://arxiv.org/abs/1702.08005) for retention notes on
  achievements and social features across player lifecycle.
- Browser/open-world feasibility references: [Slow Roads](https://slowroads.io/),
  [Three.js](https://threejs.org/), [Babylon.js](https://www.babylonjs.com/),
  [PlayCanvas](https://playcanvas.com/), plus existing browser animal/virtual-world references such as
  Mope.io, Faunasphere and Webkinz.
