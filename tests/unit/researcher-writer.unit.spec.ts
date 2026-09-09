import { describe, expect, it, vi } from 'vitest'
import { AgentCMSClient } from '@/agents/cmsClient'
import { runResearcher } from '@/agents/researcherWriter'
import example from '../../docs/agents/researcher-example.json'
import snapshot from '../../docs/agents/researcher-example-snapshot.json'

function setup(options: { role?: string; fail?: number; network?: boolean } = {}) {
  const calls: { path: string; method: string; data: Record<string, unknown> }[] = []
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    expect(init?.headers).toMatchObject({ Authorization: 'users API-Key private-key' })
    expect(init?.redirect).toBe('error')
    calls.push({
      path: new URL(String(input)).pathname,
      method: init?.method ?? 'GET',
      data: init?.body ? JSON.parse(String(init.body)) : {},
    })
    if (calls.length === options.fail) {
      if (options.network) throw new Error('SECRET raw network request')
      return Response.json({ error: 'SECRET upstream body' }, { status: 503 })
    }
    return Response.json(
      calls.length === 1
        ? { user: { id: 7, role: options.role ?? 'agent' } }
        : { doc: { id: calls.length } },
    )
  })
  return {
    client: new AgentCMSClient('https://cms.example', 'private-key', transport),
    calls,
    transport,
  }
}

const now = () => new Date('2026-09-10T00:00:00Z')
const research = async () => ({ output: example, snapshots: [snapshot] })

describe('Researcher authenticated writer', () => {
  it('authenticates, validates, queues pending, and records linked audit metadata', async () => {
    const { client, calls } = setup()
    await expect(runResearcher(client, research, now)).resolves.toEqual({
      runId: 2,
      proposalId: 3,
      outcome: 'queued',
    })
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /api/users/me',
      'POST /api/agent-runs',
      'POST /api/agent-proposals',
      'PATCH /api/agent-runs/2',
    ])
    expect(calls[2].data).toMatchObject({
      status: 'pending',
      agentRun: 2,
      evidence: { snapshots: [snapshot] },
    })
    expect(calls[3].data).toMatchObject({
      status: 'success',
      proposalsCreated: 1,
      logs: { event: 'queued', proposalId: 3 },
    })
    expect(JSON.stringify(calls[3].data)).not.toContain(snapshot.text)
  })

  it('records abstention without creating a proposal', async () => {
    const { client, calls } = setup()
    await expect(
      runResearcher(client, async () => ({ output: null, snapshots: [] }), now),
    ).resolves.toEqual({ runId: 2, proposalId: null, outcome: 'abstained' })
    expect(calls).toHaveLength(3)
    expect(calls[2].data).toMatchObject({ status: 'success', proposalsCreated: 0 })
  })

  it.each(['editor', 'admin', 'viewer', 'translator'])(
    'rejects a %s key before running research',
    async (role) => {
      const { client, calls } = setup({ role })
      const work = vi.fn(research)
      await expect(runResearcher(client, work, now)).rejects.toThrow('agent_account_required')
      expect(work).not.toHaveBeenCalled()
      expect(calls).toHaveLength(1)
    },
  )

  it.each([{}, { ...example, status: 'published' }, { ...example, evidence: [] }])(
    'rejects invalid output without queue writes',
    async (output) => {
      const { client, calls } = setup()
      await expect(
        runResearcher(client, async () => ({ output, snapshots: [snapshot] }), now),
      ).rejects.toThrow('run_2_failed_check_queue')
      expect(calls.map((c) => c.path)).not.toContain('/api/agent-proposals')
      expect(calls[2].data.status).toBe('failed')
    },
  )

  it('records safe errors when the researcher throws arbitrary content', async () => {
    const { client, calls } = setup()
    await expect(
      runResearcher(
        client,
        async () => {
          throw new Error('SECRET raw model output')
        },
        now,
      ),
    ).rejects.toThrow('run_2_failed_check_queue')
    expect(JSON.stringify(calls)).not.toContain('SECRET')
  })

  it.each([true, false])('never retries uncertain POST failures (network=%s)', async (network) => {
    const { client, calls } = setup({ fail: 3, network })
    await expect(runResearcher(client, research, now)).rejects.toThrow('run_2_failed_check_queue')
    expect(calls.filter((c) => c.path === '/api/agent-proposals')).toHaveLength(1)
    expect(calls[3].data).toMatchObject({
      status: 'failed',
      logs: { reconciliationRequired: true },
    })
    expect(JSON.stringify(calls[3])).not.toContain('SECRET')
  })

  it('preserves the known proposal ID if audit completion fails', async () => {
    const { client, calls } = setup({ fail: 4 })
    await expect(runResearcher(client, research, now)).rejects.toThrow('run_2_failed_check_queue')
    expect(calls[4].data).toMatchObject({ proposalsCreated: 1, logs: { proposalId: 3 } })
  })

  it('fails safely when audit storage remains unavailable', async () => {
    const { client } = setup()
    vi.spyOn(client, 'finishRun').mockRejectedValue(new Error('SECRET'))
    await expect(runResearcher(client, research, now)).rejects.toThrow(
      'run_2_audit_unavailable_check_queue',
    )
  })

  it.each([
    'http://cms.example',
    'https://secret@cms.example',
    'https://cms.example/path',
    'https://cms.example/?key=secret',
  ])('refuses unsafe CMS configuration %s', (url) => {
    expect(() => new AgentCMSClient(url, 'key')).toThrow('invalid_client_configuration')
  })

  it('allows local development and rejects external API paths', async () => {
    expect(() => new AgentCMSClient('http://127.0.0.1:3000', 'key')).not.toThrow()
    const { client } = setup()
    await expect(client.request('https://attacker.example')).rejects.toThrow('invalid_api_path')
  })

  it('rejects malformed CMS responses', async () => {
    const client = new AgentCMSClient(
      'https://cms.example',
      'key',
      vi.fn<typeof fetch>(async () => Response.json({})),
    )
    await expect(client.create('agent-runs', {})).rejects.toThrow('invalid_cms_response')
  })
})
