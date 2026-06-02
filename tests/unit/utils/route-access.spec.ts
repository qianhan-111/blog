import { describe, expect, it } from 'vitest'

import { canAccessRoleArea } from '@/utils/route-access'

describe('canAccessRoleArea', () => {
  it('allows guests into public area only', () => {
    expect(canAccessRoleArea('guest', 'public')).toBe(true)
    expect(canAccessRoleArea('guest', 'author')).toBe(false)
    expect(canAccessRoleArea('guest', 'admin')).toBe(false)
  })

  it('allows authors into public and author areas only', () => {
    expect(canAccessRoleArea('author', 'public')).toBe(true)
    expect(canAccessRoleArea('author', 'author')).toBe(true)
    expect(canAccessRoleArea('author', 'admin')).toBe(false)
  })

  it('allows admins into public and admin areas only', () => {
    expect(canAccessRoleArea('admin', 'public')).toBe(true)
    expect(canAccessRoleArea('admin', 'author')).toBe(false)
    expect(canAccessRoleArea('admin', 'admin')).toBe(true)
  })
})
