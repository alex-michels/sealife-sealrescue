'use client'
import { useCallback, useEffect, useState } from 'react'
import type { AgentProposal } from '@/payload-types'

const copy = {
  en: {
    title: 'Agent review',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    applied: 'Applied',
    loading: 'Loading proposals…',
    empty: 'No proposals in this queue.',
    error: 'Could not load proposals.',
    retry: 'Retry',
    before: 'Before',
    after: 'Proposed',
    field: 'Field',
    changes: 'Proposed changes',
    evidence: 'Sources and evidence',
    approve: 'Approve',
    reject: 'Reject',
    edit: 'Edit proposed values (JSON)',
    save: 'Save changes for review',
    apply: 'Apply as draft',
    notes: 'Review notes',
    confidence: 'Confidence',
    unknown: 'Not provided',
    raw: 'Open CMS record',
    warning:
      'Applying saves a draft and clears verification stamps. Review and publish the draft separately.',
    failed: 'Action failed. Reload the queue and review the current values before retrying.',
    conflict:
      'The proposal or centre changed. Reload and review the current values; nothing was overwritten.',
    invalid:
      'These changes do not match the supported Researcher contract. Check values and evidence.',
    done: 'Saved.',
    draft: 'Open centre draft',
    previous: 'Previous page',
    next: 'Next page',
    filter: 'Queue status',
  },
  ru: {
    title: 'Предложения агентов',
    pending: 'Ожидают',
    approved: 'Одобрены',
    rejected: 'Отклонены',
    applied: 'Применены',
    loading: 'Загружаем предложения…',
    empty: 'В этой очереди пока нет предложений.',
    error: 'Не удалось загрузить предложения.',
    retry: 'Повторить',
    before: 'Было',
    after: 'Предложено',
    field: 'Поле',
    changes: 'Предлагаемые изменения',
    evidence: 'Источники и доказательства',
    approve: 'Одобрить',
    reject: 'Отклонить',
    edit: 'Изменить значения (JSON)',
    save: 'Сохранить на повторное ревью',
    apply: 'Применить как черновик',
    notes: 'Заметки ревьюера',
    confidence: 'Уверенность',
    unknown: 'Не указана',
    raw: 'Открыть запись CMS',
    warning:
      'Применение сохраняет черновик и сбрасывает отметки проверки. Проверьте и опубликуйте черновик отдельно.',
    failed:
      'Не удалось выполнить действие. Обновите очередь и проверьте текущие значения перед повтором.',
    conflict:
      'Предложение или центр изменились. Обновите данные и проверьте текущие значения; ничего не перезаписано.',
    invalid:
      'Изменения не соответствуют контракту Researcher. Проверьте значения и доказательства.',
    done: 'Сохранено.',
    draft: 'Открыть черновик центра',
    previous: 'Предыдущая страница',
    next: 'Следующая страница',
    filter: 'Статус очереди',
  },
}
type Language = keyof typeof copy
type JsonRecord = Record<string, unknown>
const record = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
const json = (value: unknown) => JSON.stringify(value ?? null, null, 2)
const buttonClass = 'btn btn--style-secondary btn--size-small'

export function ProposalQueue({ language }: { language: Language }) {
  const t = copy[language]
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [docs, setDocs] = useState<AgentProposal[]>([])
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const load = useCallback(
    (signal?: AbortSignal) => {
      const query = new URLSearchParams({
        'where[status][equals]': status,
        limit: '10',
        page: String(page),
        depth: '0',
        sort: '-createdAt',
      })
      return fetch(`/api/agent-proposals?${query}`, {
        signal,
        credentials: 'same-origin',
        cache: 'no-store',
      })
        .then((response) => {
          if (!response.ok) throw new Error('load')
          return response.json()
        })
        .then((data) => {
          if (!signal?.aborted) {
            setError(false)
            setDocs(data.docs)
            setHasNext(data.hasNextPage)
          }
        })
        .catch(() => {
          if (!signal?.aborted) setError(true)
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false)
        })
    },
    [page, status],
  )
  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])
  return (
    <section>
      <h1>{t.title}</h1>
      <p>{t.warning}</p>
      <label>
        {t.filter}{' '}
        <select
          value={status}
          onChange={(event) => {
            setLoading(true)
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          {(['pending', 'approved', 'rejected', 'applied'] as const).map((value) => (
            <option key={value} value={value}>
              {t[value]}
            </option>
          ))}
        </select>
      </label>
      {loading ? (
        <p role="status">{t.loading}</p>
      ) : error ? (
        <div role="alert">
          <p>{t.error}</p>
          <button className={buttonClass} onClick={() => void load()}>
            {t.retry}
          </button>
        </div>
      ) : docs.length === 0 ? (
        <p>{t.empty}</p>
      ) : (
        docs.map((doc) => (
          <ProposalCard
            key={`${doc.id}-${doc.updatedAt}`}
            doc={doc}
            language={language}
            reload={() => void load()}
          />
        ))
      )}
      <nav aria-label={t.title}>
        <button
          className={buttonClass}
          disabled={loading || page === 1}
          onClick={() => {
            setLoading(true)
            setPage(page - 1)
          }}
        >
          {t.previous}
        </button>{' '}
        <button
          className={buttonClass}
          disabled={loading || !hasNext}
          onClick={() => {
            setLoading(true)
            setPage(page + 1)
          }}
        >
          {t.next}
        </button>
      </nav>
    </section>
  )
}

function ProposalCard({
  doc,
  language,
  reload,
}: {
  doc: AgentProposal
  language: Language
  reload: () => void
}) {
  const t = copy[language]
  const changes = Object.entries(record(doc.diff)).map(([field, value]) => ({
    field,
    from: record(value).from,
    to: record(value).to,
  }))
  const evidence = record(doc.evidence)
  const sources = Array.isArray(evidence.sources) ? evidence.sources.map(record) : []
  const claims = Array.isArray(evidence.claims) ? evidence.claims.map(record) : []
  const [values, setValues] = useState(
    json(Object.fromEntries(changes.map((change) => [change.field, change.to]))),
  )
  const [notes, setNotes] = useState(doc.reviewerNotes ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [targetId, setTargetId] = useState<string | number | null>(
    doc.status === 'applied' ? (doc.targetId ?? null) : null,
  )
  async function act(action: string) {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/agent-proposals/${doc.id}/review`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          expectedUpdatedAt: doc.updatedAt,
          notes,
          ...(action === 'edit' ? { values: JSON.parse(values) as unknown } : {}),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(
          ['proposal_changed', 'target_changed'].includes(data.error)
            ? t.conflict
            : response.status === 422
              ? t.invalid
              : t.failed,
        )
        return
      }
      if (action === 'apply') {
        setTargetId(data.targetId)
        setMessage(t.done)
      } else reload()
    } catch {
      setMessage(t.failed)
    } finally {
      setBusy(false)
    }
  }
  return (
    <article style={{ marginBlock: '2rem' }} aria-label={doc.summary}>
      <h2>{doc.summary}</h2>
      <p>
        {t.confidence}:{' '}
        {typeof doc.confidence === 'number' ? `${Math.round(doc.confidence * 100)}%` : t.unknown} ·{' '}
        <a href={`/admin/collections/agent-proposals/${doc.id}`}>{t.raw}</a>
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <caption>{t.changes}</caption>
          <thead>
            <tr>
              <th scope="col">{t.field}</th>
              <th scope="col">{t.before}</th>
              <th scope="col">{t.after}</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.field}>
                <th scope="row">{change.field}</th>
                <td>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{json(change.from)}</pre>
                </td>
                <td>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{json(change.to)}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>{t.evidence}</h3>
      <ul>
        {sources.map((source, index) => (
          <li key={index}>
            {typeof source.url === 'string' && /^https?:\/\//.test(source.url) && (
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.url}
              </a>
            )}
            {typeof source.checkedAt === 'string' && (
              <p>
                <time dateTime={source.checkedAt}>{source.checkedAt}</time>
              </p>
            )}
            {claims
              .filter((claim) => claim.sourceId === source.sourceId)
              .map((claim, claimIndex) => (
                <blockquote key={claimIndex}>
                  {typeof claim.quote === 'string' ? claim.quote : ''}
                </blockquote>
              ))}
          </li>
        ))}
      </ul>
      <details>
        <summary>{t.raw}</summary>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{json(doc.evidence)}</pre>
      </details>
      {!targetId && doc.status !== 'applied' && (
        <fieldset disabled={busy}>
          <label>
            {t.notes}
            <textarea
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <details>
            <summary>{t.edit}</summary>
            <textarea
              aria-label={t.edit}
              value={values}
              rows={8}
              onChange={(event) => setValues(event.target.value)}
            />
            <button className={buttonClass} onClick={() => void act('edit')}>
              {t.save}
            </button>
          </details>
          {doc.status === 'pending' && (
            <>
              <button className={buttonClass} onClick={() => void act('approve')}>
                {t.approve}
              </button>{' '}
              <button className={buttonClass} onClick={() => void act('reject')}>
                {t.reject}
              </button>
            </>
          )}
          {doc.status === 'approved' && (
            <button className={buttonClass} onClick={() => void act('apply')}>
              {t.apply}
            </button>
          )}
        </fieldset>
      )}
      {message && <p role="status">{message}</p>}
      {targetId && (
        <p>
          <a href={`/admin/collections/rescue-centers/${encodeURIComponent(String(targetId))}`}>
            {t.draft}
          </a>
        </p>
      )}
    </article>
  )
}
