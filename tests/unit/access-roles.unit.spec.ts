import { describe, it, expect } from 'vitest'
import type { Role } from '@/access/roles'
import {
  isAdmin,
  isEditor,
  isEditorField,
  isStaff,
  isLoggedIn,
  canCreateContent,
  canUpdateContent,
  readPublishedOrStaff,
} from '@/access/roles'

/**
 * Unit-слой access-матрицы (полная матрица по коллекциям — QA-13, int).
 * Инварианты №1–2 CLAUDE.md: agent НИКОГДА не в editor/delete-наборах.
 */
type AccessFn = (args: unknown) => unknown
const asReq = (role?: Role) =>
  ({ req: { user: role ? { role } : null } }) as Parameters<AccessFn>[0]

const roles: Role[] = ['admin', 'editor', 'translator', 'viewer', 'agent']

const expectAllowed = (fn: AccessFn, allowed: Role[]) => {
  for (const role of roles) {
    expect(fn(asReq(role)), `role=${role}`).toBe(allowed.includes(role))
  }
  expect(fn(asReq(undefined)), 'anonymous').toBe(false)
}

describe('access matrix (role → allow)', () => {
  it('isAdmin: только admin', () => expectAllowed(isAdmin as AccessFn, ['admin']))

  it('isEditor: admin+editor — agent исключён (инвариант №1)', () =>
    expectAllowed(isEditor as AccessFn, ['admin', 'editor']))

  it('isEditorField повторяет isEditor (field-level, напр. status в agent-proposals)', () =>
    expectAllowed(isEditorField as AccessFn, ['admin', 'editor']))

  it('isStaff: admin+editor+translator', () =>
    expectAllowed(isStaff as AccessFn, ['admin', 'editor', 'translator']))

  it('canCreateContent: редакторы И агенты (черновики разрешены)', () =>
    expectAllowed(canCreateContent as AccessFn, ['admin', 'editor', 'agent']))

  it('canUpdateContent: + translator', () =>
    expectAllowed(canUpdateContent as AccessFn, ['admin', 'editor', 'translator', 'agent']))

  it('isLoggedIn: любой аутентифицированный', () => {
    for (const role of roles) expect(isLoggedIn(asReq(role) as never)).toBe(true)
    expect(isLoggedIn(asReq(undefined) as never)).toBe(false)
  })

  it('readPublishedOrStaff: staff видит всё, аноним — только published-фильтр', () => {
    for (const role of roles) expect(readPublishedOrStaff(asReq(role) as never)).toBe(true)
    expect(readPublishedOrStaff(asReq(undefined) as never)).toEqual({
      _status: { equals: 'published' },
    })
  })
})
