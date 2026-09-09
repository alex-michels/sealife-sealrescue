import { APIError, type CollectionBeforeChangeHook } from 'payload'

/** Trust and fetch destinations can only be assigned by people, including on initial creation. */
export const protectSourceTrust: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (!req.user || ['admin', 'editor'].includes(req.user.role)) return data
  if (operation === 'create') return { ...data, trustLevel: 0 }
  for (const field of ['url', 'type', 'trustLevel']) {
    if (Object.hasOwn(data, field) && data[field] !== originalDoc[field]) {
      throw new APIError('Source approval fields require an editor.', 403)
    }
  }
  return data
}
