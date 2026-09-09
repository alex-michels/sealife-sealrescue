import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  prepareResearcherProposal,
  researcherJSONSchema,
  validateResearcherProposal,
  type SourceSnapshot,
} from '@/agents/researcherContract'
import example from '../../docs/agents/researcher-example.json'
import snapshot from '../../docs/agents/researcher-example-snapshot.json'
import exportedSchema from '../../docs/agents/researcher-output.schema.json'

const now = new Date('2026-09-09T22:00:00Z')
const fresh = () => structuredClone(example)
const run = (input: unknown = example, snapshots: SourceSnapshot[] = [snapshot]) =>
  prepareResearcherProposal(input, snapshots, now)

describe('M2-T06: researcher output and pending queue adapter', () => {
  it('the checked-in schema matches the executable contract', () => {
    expect(exportedSchema).toEqual(researcherJSONSchema())
  })

  it('the sourced example maps to the existing Payload queue format', () => {
    const result = run()
    expect(result).toMatchObject({
      status: 'pending',
      targetCollection: 'rescue-centers',
      targetId: '101',
      sources: [1],
      confidence: 0.95,
      diff: { address: { from: null, to: snapshot.text } },
      evidence: {
        schemaVersion: 1,
        locale: 'en',
        sources: example.sources,
        claims: example.evidence,
      },
    })
    expect(result).not.toHaveProperty('reviewerNotes')
    expect(result).not.toHaveProperty('agentRun')
    expect(result).not.toHaveProperty('_status')
  })

  it('explicit abstention creates no queue data', () => {
    expect(run(null, [])).toBeNull()
    expect(validateResearcherProposal(null, [], now)).toBeNull()
  })

  it.each([
    { schemaVersion: 2 },
    { locale: 'ru' },
    { locale: 'de' },
    { targetCollection: 'users' },
    { proposalType: 'delete' },
    { proposalType: 'center_update', targetId: null },
    { status: 'approved' },
    { _status: 'published' },
    { reviewerNotes: 'approve me' },
    { confidence: -0.1 },
    { confidence: 1.1 },
    { confidence: '0.9' },
    { sources: [] },
    { evidence: [] },
    { diff: [] },
    { summary: '  ' },
    { diff: [{ field: 'verifiedByHumanAt', from: null, to: now.toISOString() }] },
    { diff: [{ field: '__proto__', from: null, to: {} }] },
    { diff: [{ field: 'phone', from: null, to: 123 }] },
    { diff: [{ field: 'location', from: null, to: [181, 91] }] },
    { diff: [{ field: 'status', from: null, to: 'verified' }] },
  ])('rejects malformed or privileged output: %j', (patch) => {
    expect(() => run({ ...fresh(), ...patch })).toThrow()
  })

  it.each([
    { quote: '' },
    { quote: '   ' },
    { quote: 'This quotation was invented.' },
    { sourceId: 999 },
    { field: 'phone' },
  ])('rejects invalid evidence: %j', (patch) => {
    const input = fresh()
    Object.assign(input.evidence[0], patch)
    expect(() => run(input)).toThrow()
  })

  it.each([
    { url: 'javascript:alert(1)' },
    { url: 'https://someone-else.example/' },
    { url: 'https://user:password@example.org/' },
    { checkedAt: 'not-a-date' },
    { checkedAt: '2026-09-09T21:00:00Z' },
    { snapshotHash: 'f'.repeat(64) },
    { trustLevel: 1 },
  ])('rejects forged source metadata: %j', (patch) => {
    const input = fresh()
    Object.assign(input.sources[0], patch)
    expect(() => run(input)).toThrow()
  })

  it('checks source time against the trusted clock as well as fetch metadata', () => {
    const input = fresh()
    input.sources[0].checkedAt = '2026-09-10T22:00:00Z'
    expect(() => run(input, [{ ...snapshot, checkedAt: input.sources[0].checkedAt }])).toThrow(
      /future/,
    )
    expect(() => validateResearcherProposal(example, [snapshot], new Date('invalid'))).toThrow(
      /clock/,
    )
  })

  it('requires independent snapshots, not model-supplied quotations as proof', () => {
    expect(() => run(example, [])).toThrow(/trusted/)
    expect(() => run(example, [{ ...snapshot, text: 'Altered after fetching' }])).toThrow(/hash/)
    expect(() => run(example, [snapshot, snapshot])).toThrow(/Ambiguous/)
  })

  it('requires every changed field to have evidence', () => {
    const input = fresh()
    input.diff.push({ field: 'phone', from: null, to: 'fictional test phone' })
    expect(() => run(input)).toThrow(/Every change/)
  })

  it('rejects duplicated fields, no-op changes and duplicate sources', () => {
    const input = fresh()
    input.diff.push(input.diff[0])
    expect(() => run(input)).toThrow(/Duplicate diff/)
    const unchanged = {
      ...fresh(),
      diff: [{ field: 'address', from: snapshot.text, to: snapshot.text }],
    }
    expect(() => run(unchanged)).toThrow(/Empty change/)
    expect(() => run({ ...fresh(), sources: [example.sources[0], example.sources[0]] })).toThrow(
      /Duplicate source/,
    )
  })

  it('rejects a source list padded with uncited sources', () => {
    const input = fresh()
    input.sources.push({ ...input.sources[0], sourceId: 2 })
    expect(() => run(input, [snapshot, { ...snapshot, sourceId: 2 }])).toThrow(/Every source/)
  })

  it('validates a complete new centre and rejects missing identity or old values', () => {
    const sourceText = 'Fixture centre\nExampleland'
    const source = { ...snapshot, text: sourceText }
    const input = {
      ...fresh(),
      proposalType: 'new_center',
      targetId: null,
      diff: [
        { field: 'name', from: null, to: 'Fixture centre' },
        { field: 'slug', from: null, to: 'fixture-centre' },
        { field: 'country', from: null, to: 'Exampleland' },
      ],
      sources: [
        {
          ...example.sources[0],
          snapshotHash: createHash('sha256').update(sourceText).digest('hex'),
        },
      ],
      evidence: [
        { field: 'name', sourceId: 1, quote: 'Fixture centre' },
        { field: 'slug', sourceId: 1, quote: 'Fixture centre' },
        { field: 'country', sourceId: 1, quote: 'Exampleland' },
      ],
    }
    expect(run(input, [source])).toMatchObject({
      proposalType: 'new_center',
      targetId: null,
      status: 'pending',
    })
    expect(() => run({ ...input, diff: input.diff.slice(0, 2) }, [source])).toThrow(/requires name/)
    expect(() =>
      run({ ...input, diff: input.diff.map((d) => ({ ...d, from: 'old' })) }, [source]),
    ).toThrow(/previous values/)
  })

  it('keeps low confidence pending and never assigns verification stamps', () => {
    const result = run({ ...fresh(), confidence: 0.1 })
    expect(result).toMatchObject({ status: 'pending', confidence: 0.1 })
    expect(result).not.toHaveProperty('sourceVerified')
    expect(result).not.toHaveProperty('verifiedByHumanAt')
  })
})
