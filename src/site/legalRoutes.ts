/** Shared route allowlist. Keep document copy out of the request proxy. */
export const legalSlugs = ['legal-notice', 'privacy', 'cookies', 'terms'] as const

export type LegalSlug = (typeof legalSlugs)[number]
