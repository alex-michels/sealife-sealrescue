import type { Access, FieldAccess } from 'payload'

// Роли проекта (master-plan §11 RBAC).
// 'agent' — служебный аккаунт для AI-агентов: может ПРЕДЛАГАТЬ и писать черновики,
// но НЕ публиковать и НЕ удалять (OWASP LLM: excessive agency).
export type Role = 'admin' | 'editor' | 'translator' | 'viewer' | 'agent'

const hasRole = (user: { role?: Role } | null | undefined, ...roles: Role[]): boolean =>
  Boolean(user && user.role && roles.includes(user.role))

export const isAdmin: Access = ({ req: { user } }) => hasRole(user, 'admin')

// Менять контент могут люди-редакторы; удалять — только admin/editor (агент исключён).
export const isEditor: Access = ({ req: { user } }) => hasRole(user, 'admin', 'editor')

// Field-level вариант isEditor (для access на отдельных полях, напр. status в agent-proposals).
export const isEditorField: FieldAccess = ({ req: { user } }) => hasRole(user, 'admin', 'editor')

export const isStaff: Access = ({ req: { user } }) =>
  hasRole(user, 'admin', 'editor', 'translator')

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

// Создавать контент/черновики: люди-редакторы И агенты.
export const canCreateContent: Access = ({ req: { user } }) =>
  hasRole(user, 'admin', 'editor', 'agent')

// Обновлять контент: редакторы, переводчики и агенты (но статус публикации — отдельно).
export const canUpdateContent: Access = ({ req: { user } }) =>
  hasRole(user, 'admin', 'editor', 'translator', 'agent')

// Публичное чтение опубликованного; staff видит и черновики.
export const readPublishedOrStaff: Access = ({ req: { user } }) => {
  if (hasRole(user, 'admin', 'editor', 'translator', 'viewer', 'agent')) return true
  return { _status: { equals: 'published' } }
}
