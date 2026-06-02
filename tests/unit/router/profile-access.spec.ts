import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import { createAppRouter } from '@/router'
import { clearAdminToken, clearUserToken } from '@/utils/auth-storage'

describe('profile route access', () => {
  beforeEach(() => {
    clearUserToken()
    clearAdminToken()
  })

  it('redirects unauthenticated visits to /profile back to /login and preserves the requested path', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/profile?tab=settings')

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.login)
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/profile?tab=settings')
  })
})
