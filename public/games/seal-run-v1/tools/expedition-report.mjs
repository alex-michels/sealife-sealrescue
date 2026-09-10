// SR-18/20: reproducible benchmark; policy is unchanged in bot-lib.
import { writeFileSync } from 'node:fs'
import { RULES_VERSION } from '../core/biomes.js'
import { generateRound } from '../core/course.js'
import { PROFILES, runBot, summarize, seasonSeeds } from './bot-lib.mjs'
const seasons = 52,
  seeds = seasonSeeds(seasons)
const courses = seeds.flatMap((s) => Array.from({ length: 5 }, (_, i) => generateRound(s, i)))
const matrix = PROFILES.map((profile) => ({
  profile,
  runs: courses.map((course) => runBot(course, profile)),
}))
const report = {
  version: RULES_VERSION,
  seasons,
  runs: courses.length * PROFILES.length,
  profiles: matrix.map(({ profile, runs }) => ({ name: profile.name, ...summarize(runs) })),
  biomes: Array.from({ length: 5 }, (_, i) => ({
    biome: courses[i].biome,
    ...summarize(matrix.flatMap(({ runs }) => runs.filter((_, index) => index % 5 === i))),
  })),
}
writeFileSync('docs/seal-run-expedition-balance.json', JSON.stringify(report, null, 2) + '\n')
console.log('Wrote 780 chapter runs to docs/seal-run-expedition-balance.json')
