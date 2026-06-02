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

describe('router guards and dynamic route injection', () => {
  beforeEach(() => {
    clearUserToken()
    clearAdminToken()
  })

  it('redirects a guest from /writer to /login and preserves the requested path', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/writer/articles?status=draft')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/writer/articles?status=draft')
    expect(router.hasRoute(ROUTE_NAMES.authorDashboard)).toBe(false)
  })

  it('redirects a guest from /admin to /admin/login and preserves the requested path', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/admin/users?page=2')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/admin/login?redirect=/admin/users?page=2')
    expect(router.hasRoute(ROUTE_NAMES.adminDashboard)).toBe(false)
  })

  it('registers writer routes when a user token exists', async () => {
    setUserToken('user-token')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/writer')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.authorDashboard)
    expect(router.hasRoute(ROUTE_NAMES.authorDashboard)).toBe(true)
  })

  it('keeps author routes available when both user and admin tokens exist', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/writer')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.authorDashboard)
    expect(router.hasRoute(ROUTE_NAMES.authorDashboard)).toBe(true)
  })

  it('registers admin routes when an admin token exists', async () => {
    setAdminToken('admin-token')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/admin')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.adminDashboard)
    expect(router.hasRoute(ROUTE_NAMES.adminDashboard)).toBe(true)
  })

  it('keeps admin routes available when both user and admin tokens exist', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/admin')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.adminDashboard)
    expect(router.hasRoute(ROUTE_NAMES.adminDashboard)).toBe(true)
  })

  it('does not unlock admin routes for a user token', async () => {
    setUserToken('user-token')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/admin')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/403')
    expect(router.currentRoute.value.query.fromArea).toBe('admin')
    expect(router.hasRoute(ROUTE_NAMES.adminDashboard)).toBe(false)
  })

  it('redirects an admin token away from writer-only routes to /403', async () => {
    setAdminToken('admin-token')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/writer')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/403')
    expect(router.currentRoute.value.query.fromArea).toBe('author')
    expect(router.hasRoute(ROUTE_NAMES.authorDashboard)).toBe(false)
  })

  it('registers protected routes on an already-created router after login for named navigation', async () => {
    const router = createAppRouter(createMemoryHistory())

    setUserToken('user-token')
    await router.push({ name: ROUTE_NAMES.authorDashboard })
    await router.isReady()

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.authorDashboard)
    expect(router.hasRoute(ROUTE_NAMES.authorDashboard)).toBe(true)
  })

  it('treats /writer-foo as not-found instead of protected author area', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/writer-foo')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.notFound)
    expect(router.currentRoute.value.fullPath).toBe('/writer-foo')
  })

  it('treats /admin-foo as not-found instead of protected admin area', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/admin-foo')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.notFound)
    expect(router.currentRoute.value.fullPath).toBe('/admin-foo')
  })
})
