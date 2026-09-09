import { AgentCMSClient, AgentError } from './cmsClient'
import { prepareResearcherProposal, type SourceSnapshot } from './researcherContract'

export interface ResearchResult {
  output: unknown
  /** Trusted worker input, never extracted from the model response. */
  snapshots: readonly SourceSnapshot[]
}

export interface WriteResult {
  runId: number
  proposalId: number | null
  outcome: 'queued' | 'abstained'
}

/** One bounded, manually initiated run. There are deliberately no automatic POST retries. */
export async function runResearcher(
  client: AgentCMSClient,
  research: () => Promise<ResearchResult>,
  now: () => Date = () => new Date(),
): Promise<WriteResult> {
  await client.authenticate()
  const runId = await client.create('agent-runs', {
    agentName: 'researcher',
    status: 'running',
    startedAt: now().toISOString(),
    proposalsCreated: 0,
    logs: { event: 'started' },
  })
  let proposalId: number | null = null
  try {
    const result = await research()
    let proposal
    try {
      proposal = prepareResearcherProposal(result.output, result.snapshots, now())
    } catch {
      throw new AgentError('invalid_researcher_output')
    }
    if (proposal) {
      proposalId = await client.create('agent-proposals', {
        ...proposal,
        // Retain only cited snapshots with the proposal, not in the audit log.
        evidence: {
          ...(proposal.evidence as Record<string, unknown>),
          snapshots: result.snapshots.filter((snapshot) =>
            proposal.sources.includes(snapshot.sourceId),
          ),
        },
        agentRun: runId,
      })
    }
    const outcome = proposalId === null ? 'abstained' : 'queued'
    await client.finishRun(runId, {
      status: 'success',
      finishedAt: now().toISOString(),
      proposalsCreated: proposalId === null ? 0 : 1,
      logs: { event: outcome, proposalId },
    })
    return { runId, proposalId, outcome }
  } catch {
    // Never persist model output, source text, exception messages or HTTP response bodies in logs.
    // A failed POST can have committed remotely: report uncertainty, never blindly retry it.
    try {
      await client.finishRun(runId, {
        status: 'failed',
        finishedAt: now().toISOString(),
        proposalsCreated: proposalId === null ? 0 : 1,
        logs: { event: 'run_failed', proposalId, reconciliationRequired: true },
      })
    } catch {
      throw new AgentError(`run_${runId}_audit_unavailable_check_queue`)
    }
    throw new AgentError(`run_${runId}_failed_check_queue`)
  }
}
