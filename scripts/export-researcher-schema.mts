import { writeFileSync } from 'node:fs'
import { researcherJSONSchema } from '../src/agents/researcherContract'

writeFileSync(
  new URL('../docs/agents/researcher-output.schema.json', import.meta.url),
  `${JSON.stringify(researcherJSONSchema(), null, 2)}\n`,
)
