import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import { createAppRouter } from '@/router'
import {
  clearAdminToken,
  clearUserToken,
  setAdminToken,
  setUserToken,
} from '@/utils/auth-storage'

describe('router structure', () => {
  beforeEach(() => {
    clearUserToken()
    clearAdminToken()
  })

  it('registers public routes, admin login, and not-found routes for a guest router', () => {
    const router = createAppRouter(createMemoryHistory())
    const adminLoginRoute = router.resolve({ name: ROUTE_NAMES.adminLogin })

    expect(router.resolve({ name: ROUTE_NAMES.home }).path).toBe('/')
    expect(router.resolve({ name: ROUTE_NAMES.articleDetail, params: { id: 42 } }).path).toBe(
      '/articles/42',
    )
    expect(router.resolve({ name: ROUTE_NAMES.authorProfile, params: { id: 7 } }).path).toBe(
      '/authors/7',
    )
    expect(router.resolve({ name: ROUTE_NAMES.login }).path).toBe('/login')
    expect(router.resolve({ name: ROUTE_NAMES.register }).path).toBe('/register')
    expect(router.resolve({ name: ROUTE_NAMES.profile }).path).toBe('/profile')
    expect(adminLoginRoute.path).toBe('/admin/login')
    expect(adminLoginRoute.matched).toHaveLength(1)
    expect(adminLoginRoute.matched[0]?.name).toBe(ROUTE_NAMES.adminLogin)
    expect(router.resolve({ name: ROUTE_NAMES.forbidden }).path).toBe('/403')
    expect(router.resolve('/missing').name).toBe(ROUTE_NAMES.notFound)
    expect(router.hasRoute(ROUTE_NAMES.authorDashboard)).toBe(false)
    expect(router.hasRoute(ROUTE_NAMES.adminDashboard)).toBe(false)
  })

  it('registers protected route trees when tokens exist at router creation', () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    const router = createAppRouter(createMemoryHistory())

    expect(router.resolve({ name: ROUTE_NAMES.authorDashboard }).path).toBe('/writer')
    expect(router.resolve({ name: ROUTE_NAMES.adminDashboard }).path).toBe('/admin')
    expect(router.resolve({ name: ROUTE_NAMES.adminUsers }).path).toBe('/admin/users')
  })
})
