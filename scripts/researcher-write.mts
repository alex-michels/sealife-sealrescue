import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { AgentCMSClient } from '../src/agents/cmsClient'
import { runResearcher } from '../src/agents/researcherWriter'

// Explicit operator-owned files: snapshots must come from the trusted fetcher, not the model.
const snapshotsSchema = z
  .array(
    z.strictObject({
      sourceId: z.number().int().positive(),
      url: z.string().url(),
      checkedAt: z.iso.datetime(),
      text: z.string().min(1).max(100_000),
    }),
  )
  .max(30)

try {
  const [outputFile, snapshotsFile] = process.argv.slice(2)
  if (!outputFile || !snapshotsFile) throw new Error('arguments')
  const client = new AgentCMSClient(
    process.env.AGENT_CMS_URL ?? '',
    process.env.RESEARCHER_API_KEY ?? '',
  )
  const result = await runResearcher(client, async () => ({
    output: JSON.parse(await readFile(outputFile, 'utf8')) as unknown,
    snapshots: snapshotsSchema.parse(JSON.parse(await readFile(snapshotsFile, 'utf8'))),
  }))
  process.stdout.write(`${JSON.stringify(result)}\n`)
} catch {
  process.stderr.write(
    'Researcher write failed. Inspect agent-runs and the queue before retrying.\n',
  )
  process.exitCode = 1
}
