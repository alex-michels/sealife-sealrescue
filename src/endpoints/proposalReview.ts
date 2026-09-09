import type { Endpoint } from 'payload'
import { ReviewError } from '@/agents/proposalReview'
import { reviewProposal } from '@/agents/reviewService'

export const proposalReview: Endpoint = {
  path: '/:id/review',
  method: 'post',
  handler: async (req) => {
    if (!req.user || !['admin', 'editor'].includes(req.user.role))
      return Response.json({ error: 'editor_required' }, { status: 403 })
    // Cookie-authenticated mutations must originate from this CMS. API-key callers may omit Origin.
    const origin = req.headers.get('origin')
    if (origin && origin !== new URL(req.url!).origin)
      return Response.json({ error: 'origin_forbidden' }, { status: 403 })
    const id = Number(req.routeParams?.id)
    if (!Number.isSafeInteger(id) || id <= 0)
      return Response.json({ error: 'invalid_id' }, { status: 400 })
    try {
      const body = await req.text!()
      if (body.length > 50_000)
        return Response.json({ error: 'request_too_large' }, { status: 413 })
      const result = await reviewProposal(req, id, JSON.parse(body) as unknown)
      return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
      return Response.json(
        { error: error instanceof ReviewError ? error.code : 'invalid_request' },
        { status: error instanceof ReviewError ? error.status : 400 },
      )
    }
  },
}
