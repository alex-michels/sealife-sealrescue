// SR-03/18: paired comparison on identical expedition-2 course objects.
// Usage: node .../current-comparison.mjs test-results/sr-motion-baseline
// Baseline directory contains core/ and tools/bot-lib.mjs from eed03b96.
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFileSync } from 'node:fs'
import { PROFILES, runBot, summarize, seasonSeeds } from './bot-lib.mjs'
import { RULES_VERSION } from '../core/biomes.js'
if (!process.argv[2]) throw new Error('Pass the extracted baseline game directory')
const base = resolve(process.argv[2])
const oldCourse = await import(pathToFileURL(resolve(base, 'core/course.js')))
const oldBot = await import(pathToFileURL(resolve(base, 'tools/bot-lib.mjs')))
const courses = seasonSeeds(52).flatMap((s) =>
  Array.from({ length: 5 }, (_, i) => oldCourse.generateRound(s, i)),
)
const profiles = PROFILES.map((profile) => {
  const before = courses.map((c) => oldBot.runBot(c, profile))
  const after = courses.map((c) => runBot(c, profile))
  return {
    profile,
    before: summarize(before),
    after: summarize(after),
    pairs: courses.map((c, i) => ({
      seed: c.seedStr,
      biome: c.biome,
      before: before[i],
      after: after[i],
    })),
  }
})
const report = {
  baselineCommit: 'eed03b96de72cdabd3f91e37bdf6955bee68c418',
  baselineVersion: 'expedition-2',
  version: RULES_VERSION,
  courses: courses.length,
  pairedRuns: courses.length * PROFILES.length,
  method:
    'Identical baseline courses; unchanged bot weights, 720 lu lookahead and input cadence. New predictor uses current coordinate; no policy tuning. No burst. Bots are a diagnostic, not human playtesting.',
  profiles,
  biomes: [...new Set(courses.map((c) => c.biome))].map((biome) => ({
    biome,
    before: summarize(
      profiles.flatMap((p) => p.pairs.filter((r) => r.biome === biome).map((r) => r.before)),
    ),
    after: summarize(
      profiles.flatMap((p) => p.pairs.filter((r) => r.biome === biome).map((r) => r.after)),
    ),
  })),
}
writeFileSync('docs/seal-run-current-comparison.json', JSON.stringify(report, null, 2) + '\n')
console.log(
  JSON.stringify(
    profiles.map(({ profile, before, after }) => ({ profile, before, after })),
    null,
    2,
  ),
)
