import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { AgentCMSClient } from '../src/agents/cmsClient'
import { runLiveResearcher } from '../src/agents/researcherGraph'
import { researcherModel, tavilySearch } from '../src/agents/researcherProviders'
import {
  extractSourceText,
  fetchSourceSnapshot,
  launchSourceBrowser,
} from '../src/agents/sourceFetcher'

try {
  const jobFile = process.argv[2]
  if (!jobFile) throw new Error('job_required')
  const client = new AgentCMSClient(
    process.env.AGENT_CMS_URL ?? '',
    process.env.RESEARCHER_API_KEY ?? '',
  )
  const instructions = await readFile(
    new URL('../docs/agents/researcher-prompt.md', import.meta.url),
    'utf8',
  )
  const search = tavilySearch(process.env.TAVILY_API_KEY ?? '')
  const model = researcherModel(
    process.env.OPENAI_API_KEY ?? '',
    process.env.RESEARCHER_MODEL ?? '',
    instructions,
  )
  const browser = await launchSourceBrowser()
  try {
    const result = await runLiveResearcher(client, JSON.parse(await readFile(jobFile, 'utf8')), {
      sources: async () => {
        const result = z
          .object({ docs: z.array(z.unknown()), hasNextPage: z.literal(false) })
          .parse(await client.request('/api/sources?limit=1000&depth=0'))
        return result.docs
      },
      target: async (id) =>
        z
          .record(z.string(), z.unknown())
          .parse(await client.request(`/api/rescue-centers/${id}?locale=en&depth=0&draft=true`)),
      search,
      model,
      fetch: (source) => fetchSourceSnapshot(source, (html) => extractSourceText(browser, html)),
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } finally {
    await browser.close()
  }
} catch {
  process.stderr.write(
    'Researcher run failed. Check configuration and agent-runs before retrying.\n',
  )
  process.exitCode = 1
}
