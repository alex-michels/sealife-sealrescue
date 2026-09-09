import { z } from 'zod'

const documentID = z.object({ id: z.number().int().positive() })

/** Deliberately carries no upstream body, URL, credential, or exception cause. */
export class AgentError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = 'AgentError'
  }
}

/** A service account uses the same authenticated REST surface as an external worker. */
export class AgentCMSClient {
  private readonly origin: string
  private readonly authorization: string

  constructor(
    baseURL: string,
    apiKey: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    const url = new URL(baseURL)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      !apiKey ||
      /[\r\n]/.test(apiKey)
    )
      throw new AgentError('invalid_client_configuration')
    this.origin = url.origin
    this.authorization = `users API-Key ${apiKey}`
  }

  async request(path: string, method = 'GET', data?: unknown): Promise<unknown> {
    // Relative, fixed API paths only; never send a service key to a model-supplied URL.
    if (!/^\/api\/[a-z0-9/?=&%._-]+$/i.test(path)) throw new AgentError('invalid_api_path')
    try {
      const response = await this.transport(`${this.origin}${path}`, {
        method,
        headers: { Authorization: this.authorization, 'Content-Type': 'application/json' },
        body: data === undefined ? undefined : JSON.stringify(data),
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new AgentError(`cms_http_${response.status}`)
      return await response.json()
    } catch (error) {
      if (error instanceof AgentError) throw error
      throw new AgentError('cms_request_failed')
    }
  }

  async authenticate(): Promise<number> {
    const result = z
      .object({ user: documentID.extend({ role: z.literal('agent') }) })
      .safeParse(await this.request('/api/users/me'))
    if (!result.success) throw new AgentError('agent_account_required')
    return result.data.user.id
  }

  async create(collection: 'agent-proposals' | 'agent-runs', data: unknown): Promise<number> {
    const result = z
      .object({ doc: documentID })
      .safeParse(await this.request(`/api/${collection}`, 'POST', data))
    if (!result.success) throw new AgentError('invalid_cms_response')
    return result.data.doc.id
  }

  async finishRun(id: number, data: unknown): Promise<void> {
    await this.request(`/api/agent-runs/${id}`, 'PATCH', data)
  }
}
