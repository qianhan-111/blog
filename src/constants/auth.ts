import type { AuthRole } from '@/types/auth'

export const AUTH_STORAGE_KEYS = {
  userToken: 'blog.user.token',
  adminToken: 'blog.admin.token',
} as const

export const AUTH_ROLES = ['guest', 'author', 'admin'] as const satisfies readonly AuthRole[]
