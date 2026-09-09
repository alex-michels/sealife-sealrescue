import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { z } from 'zod'
import { AgentCMSClient, AgentError } from './cmsClient'
import { allowedSources, type ResearchSource } from './sourcePolicy'
import {
  researcherFields,
  validateResearcherProposal,
  type SourceSnapshot,
} from './researcherContract'
import { runResearcher } from './researcherWriter'
import type { ModelInput } from './researcherProviders'

export const researchJobSchema = z.strictObject({
  query: z.string().min(1).max(500),
  targetId: z.number().int().positive().nullable(),
  sourceIds: z.array(z.number().int().positive()).min(1).max(3),
})
type ResearchJob = z.infer<typeof researchJobSchema>

export interface ResearchDependencies {
  sources: () => Promise<unknown>
  target: (id: number) => Promise<Record<string, unknown>>
  search: (query: string, domains: string[]) => Promise<string[]>
  fetch: (source: ResearchSource) => Promise<SourceSnapshot>
  model: (input: ModelInput) => Promise<unknown>
}

const State = Annotation.Root({
  job: Annotation<ResearchJob>(),
  sources: Annotation<ResearchSource[]>(),
  target: Annotation<Record<string, unknown> | null>(),
  snapshots: Annotation<SourceSnapshot[]>(),
  output: Annotation<unknown>(),
})

/** Acyclic and bounded: approved sources → search → live fetch → model → validation. */
export function buildResearcherGraph(deps: ResearchDependencies) {
  return new StateGraph(State)
    .addNode('allowlist', async ({ job }) => {
      const approved = allowedSources(await deps.sources())
      const sources = job.sourceIds.map((id) => approved.find((source) => source.id === id))
      if (
        new Set(job.sourceIds).size !== job.sourceIds.length ||
        sources.some((source) => !source)
      ) {
        throw new AgentError('source_not_allowlisted')
      }
      const doc = job.targetId === null ? null : await deps.target(job.targetId)
      // Do not send descriptions, staff/account data or unrelated CMS fields to providers.
      const target = doc
        ? Object.fromEntries(['id', ...researcherFields].map((key) => [key, doc[key] ?? null]))
        : null
      return { sources: sources as ResearchSource[], target }
    })
    .addNode('search', async ({ job, sources }) => {
      const hits = await deps.search(job.query, [
        ...new Set(sources.map((source) => new URL(source.url).hostname)),
      ])
      // Search can rank approved exact URLs, never create or approve a fetch destination.
      return {
        sources: [...sources].sort(
          (a, b) => Number(hits.includes(b.url)) - Number(hits.includes(a.url)),
        ),
      }
    })
    .addNode('fetch', async ({ sources }) => {
      const snapshots: SourceSnapshot[] = []
      for (const source of sources) snapshots.push(await deps.fetch(source))
      return { snapshots }
    })
    .addNode('model', async ({ job, target, snapshots }) => ({
      output: await deps.model({ query: job.query, target, snapshots }),
    }))
    .addNode('validate', ({ job, output, snapshots }) => {
      const proposal = validateResearcherProposal(output, snapshots)
      if (proposal && proposal.targetId !== (job.targetId === null ? null : String(job.targetId))) {
        throw new AgentError('unexpected_proposal_target')
      }
      return { output: proposal }
    })
    .addEdge(START, 'allowlist')
    .addEdge('allowlist', 'search')
    .addEdge('search', 'fetch')
    .addEdge('fetch', 'model')
    .addEdge('model', 'validate')
    .addEdge('validate', END)
    .compile()
}

export async function runLiveResearcher(
  client: AgentCMSClient,
  job: unknown,
  deps: ResearchDependencies,
) {
  const parsed = researchJobSchema.parse(job)
  // Never opt in to framework telemetry; credentials and source contents stay out of traces.
  if (
    ['LANGCHAIN_TRACING', 'LANGCHAIN_TRACING_V2', 'LANGSMITH_TRACING', 'LANGSMITH_TRACING_V2'].some(
      (key) => {
        const value = process.env[key]?.toLowerCase()
        return value && value !== 'false' && value !== '0'
      },
    )
  ) {
    throw new AgentError('external_tracing_forbidden')
  }
  return runResearcher(client, async () => {
    const result = await buildResearcherGraph(deps).invoke(
      { job: parsed },
      { recursionLimit: 8, callbacks: [] },
    )
    return { output: result.output, snapshots: result.snapshots }
  })
}
