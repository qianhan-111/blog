import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { getAdminProfile, loginAdmin, logoutAdmin } from '@/api/admin-auth'
import { HttpClientError } from '@/api/client'
import { useAdminAuthStore } from '@/stores/adminAuth'
import {
  clearAdminToken,
  clearUserToken,
  getAdminToken,
  getUserToken,
  setAdminToken,
  setUserToken,
} from '@/utils/auth-storage'

vi.mock('@/api/admin-auth', () => ({
  loginAdmin: vi.fn(),
  getAdminProfile: vi.fn(),
  logoutAdmin: vi.fn(),
}))

const loginAdminMock = vi.mocked(loginAdmin)
const getAdminProfileMock = vi.mocked(getAdminProfile)
const logoutAdminMock = vi.mocked(logoutAdmin)

const adminProfile = {
  id: 1,
  username: 'admin',
  nickname: 'Platform Admin',
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return {
    promise,
    reject,
    resolve,
  }
}

describe('admin auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearUserToken()
    clearAdminToken()
    loginAdminMock.mockReset()
    getAdminProfileMock.mockReset()
    logoutAdminMock.mockReset()
  })

  it('stores only the admin token during login and keeps the user token untouched', async () => {
    setUserToken('user-token')
    loginAdminMock.mockResolvedValue({ token: 'admin-token' })
    getAdminProfileMock.mockResolvedValue(adminProfile)

    const store = useAdminAuthStore()

    await store.login({
      account: 'admin',
      password: 'secret',
    })

    expect(loginAdminMock).toHaveBeenCalledWith({
      account: 'admin',
      password: 'secret',
    })
    expect(getAdminToken()).toBe('admin-token')
    expect(getUserToken()).toBe('user-token')
    expect(store.profile).toEqual(adminProfile)
  })

  it('clears only the admin token during logout and leaves the user token untouched', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    logoutAdminMock.mockResolvedValue(null)

    const store = useAdminAuthStore()
    store.token = 'admin-token'
    store.profile = adminProfile

    await store.logout()

    expect(logoutAdminMock).toHaveBeenCalledTimes(1)
    expect(getAdminToken()).toBeNull()
    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(getUserToken()).toBe('user-token')
  })

  it('hydrates from the admin token without touching the user token', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    getAdminProfileMock.mockResolvedValue(adminProfile)

    const store = useAdminAuthStore()

    await store.hydrate()

    expect(getAdminProfileMock).toHaveBeenCalledTimes(1)
    expect(store.token).toBe('admin-token')
    expect(store.profile).toEqual(adminProfile)
    expect(getUserToken()).toBe('user-token')
  })

  it('keeps the new admin token when login succeeds but profile loading times out', async () => {
    setUserToken('user-token')
    loginAdminMock.mockResolvedValue({ token: 'admin-token' })
    getAdminProfileMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const store = useAdminAuthStore()

    await expect(
      store.login({
        account: 'admin',
        password: 'secret',
      }),
    ).rejects.toThrow('请求超时，请稍后重试')

    expect(store.token).toBe('admin-token')
    expect(store.profile).toBeNull()
    expect(store.error).toBe('请求超时，请稍后重试')
    expect(getAdminToken()).toBe('admin-token')
    expect(getUserToken()).toBe('user-token')
  })

  it('ignores an older admin login response after a newer login succeeds', async () => {
    const olderLoginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    const newerLoginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    const olderProfile = {
      id: 2,
      username: 'old-admin',
      nickname: 'Old Admin',
    }
    const newerProfile = {
      id: 3,
      username: 'new-admin',
      nickname: 'New Admin',
    }

    loginAdminMock
      .mockReturnValueOnce(olderLoginRequest.promise)
      .mockReturnValueOnce(newerLoginRequest.promise)
    getAdminProfileMock
      .mockResolvedValueOnce(newerProfile)
      .mockResolvedValueOnce(olderProfile)

    const store = useAdminAuthStore()
    const olderLogin = store.login({
      account: 'old-admin',
      password: 'secret',
    })
    const newerLogin = store.login({
      account: 'new-admin',
      password: 'secret',
    })

    newerLoginRequest.resolve({ token: 'new-admin-token' })
    await newerLogin

    olderLoginRequest.resolve({ token: 'old-admin-token' })
    await olderLogin

    expect(store.token).toBe('new-admin-token')
    expect(store.profile).toEqual(newerProfile)
    expect(store.error).toBeNull()
    expect(getAdminToken()).toBe('new-admin-token')
  })

  it('does not clear a newer admin session after an older login request fails', async () => {
    const olderLoginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    const newerLoginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    const newerProfile = {
      id: 3,
      username: 'new-admin',
      nickname: 'New Admin',
    }

    loginAdminMock
      .mockReturnValueOnce(olderLoginRequest.promise)
      .mockReturnValueOnce(newerLoginRequest.promise)
    getAdminProfileMock.mockResolvedValueOnce(newerProfile)

    const store = useAdminAuthStore()
    const olderLogin = store.login({
      account: 'old-admin',
      password: 'secret',
    })
    const newerLogin = store.login({
      account: 'new-admin',
      password: 'secret',
    })

    newerLoginRequest.resolve({ token: 'new-admin-token' })
    await newerLogin

    olderLoginRequest.reject(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))
    await olderLogin

    expect(store.token).toBe('new-admin-token')
    expect(store.profile).toEqual(newerProfile)
    expect(store.error).toBeNull()
    expect(getAdminToken()).toBe('new-admin-token')
  })

  it('ignores an admin login response after logout clears the session', async () => {
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    loginAdminMock.mockReturnValueOnce(loginRequest.promise)
    getAdminProfileMock.mockResolvedValue(adminProfile)

    const store = useAdminAuthStore()
    const login = store.login({
      account: 'admin',
      password: 'secret',
    })

    await store.logout()

    loginRequest.resolve({ token: 'admin-token' })
    await login

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBeNull()
    expect(getAdminToken()).toBeNull()
    expect(getAdminProfileMock).not.toHaveBeenCalled()
  })

  it('clears the new admin token when login profile loading confirms session expiration', async () => {
    setUserToken('user-token')
    loginAdminMock.mockResolvedValue({ token: 'admin-token' })
    getAdminProfileMock.mockRejectedValue(
      new HttpClientError({
        code: 401,
        kind: 'http',
        message: '登录已过期，请重新登录',
        retryable: false,
        shouldReport: false,
        status: 401,
      }),
    )

    const store = useAdminAuthStore()

    await expect(
      store.login({
        account: 'admin',
        password: 'secret',
      }),
    ).rejects.toThrow('登录已过期，请重新登录')

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBe('登录已过期，请重新登录')
    expect(getAdminToken()).toBeNull()
    expect(getUserToken()).toBe('user-token')
  })

  it('clears only the admin session when hydrate fails and preserves the user token', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    getAdminProfileMock.mockRejectedValue(new Error('管理员会话失效'))

    const store = useAdminAuthStore()

    await expect(store.hydrate()).resolves.toBeNull()

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBe('管理员会话失效')
    expect(getAdminToken()).toBeNull()
    expect(getUserToken()).toBe('user-token')
  })

  it('clears hydrate loading after a confirmed admin session failure', async () => {
    setAdminToken('admin-token')
    getAdminProfileMock.mockRejectedValue(
      new HttpClientError({
        code: 401,
        kind: 'http',
        message: '登录已过期，请重新登录',
        retryable: false,
        shouldReport: false,
        status: 401,
      }),
    )

    const store = useAdminAuthStore()

    await expect(store.hydrate()).resolves.toBeNull()

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBe('登录已过期，请重新登录')
    expect(store.loading).toBe(false)
  })

  it('keeps the admin token when hydrate fails with a retryable timeout error', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    getAdminProfileMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const store = useAdminAuthStore()

    await expect(store.hydrate()).resolves.toBeNull()

    expect(store.token).toBe('admin-token')
    expect(store.profile).toBeNull()
    expect(store.error).toBe('请求超时，请稍后重试')
    expect(getAdminToken()).toBe('admin-token')
    expect(getUserToken()).toBe('user-token')
  })

  it('clears the admin session when hydrate finds the account disabled', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    getAdminProfileMock.mockRejectedValue(
      new HttpClientError({
        code: 403,
        kind: 'http',
        message: '账号已被禁用',
        retryable: false,
        shouldReport: false,
        status: 403,
      }),
    )

    const store = useAdminAuthStore()

    await expect(store.hydrate()).resolves.toBeNull()

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBe('账号已被禁用')
    expect(getAdminToken()).toBeNull()
    expect(getUserToken()).toBe('user-token')
  })

  it('keeps the admin session when a confirmed auth failure belongs to an older token', () => {
    setUserToken('user-token')
    setAdminToken('new-admin-token')
    const staleAuthError = Object.assign(
      new HttpClientError({
        code: 401,
        kind: 'http',
        message: '登录已过期，请重新登录',
        retryable: false,
        shouldReport: false,
        status: 401,
      }),
      { staleAuthFailure: true },
    )

    const store = useAdminAuthStore()
    store.token = 'new-admin-token'
    store.profile = adminProfile

    expect(store.clearSessionIfConfirmedFailure(staleAuthError)).toBe(false)
    expect(store.token).toBe('new-admin-token')
    expect(store.profile).toEqual(adminProfile)
    expect(getAdminToken()).toBe('new-admin-token')
    expect(getUserToken()).toBe('user-token')
  })

  it('ignores profile data from a hydrate request started with an older token', async () => {
    const oldAdminProfile = {
      id: 2,
      username: 'old-admin',
      nickname: 'Old Admin',
    }
    const nextAdminProfile = {
      id: 3,
      username: 'new-admin',
      nickname: 'New Admin',
    }
    const profileRequest = createDeferred<typeof oldAdminProfile>()
    setAdminToken('old-admin-token')
    getAdminProfileMock.mockReturnValue(profileRequest.promise)

    const store = useAdminAuthStore()
    const hydrateRequest = store.hydrate()

    expect(getAdminProfileMock).toHaveBeenCalledTimes(1)

    setAdminToken('new-admin-token')
    store.token = 'new-admin-token'
    store.profile = nextAdminProfile

    profileRequest.resolve(oldAdminProfile)
    await hydrateRequest

    expect(store.token).toBe('new-admin-token')
    expect(store.profile).toEqual(nextAdminProfile)
    expect(getAdminToken()).toBe('new-admin-token')
  })

  it('ignores profile errors from a hydrate request started with an older token', async () => {
    const nextAdminProfile = {
      id: 3,
      username: 'new-admin',
      nickname: 'New Admin',
    }
    const profileRequest = createDeferred<typeof adminProfile>()
    setAdminToken('old-admin-token')
    getAdminProfileMock.mockReturnValue(profileRequest.promise)

    const store = useAdminAuthStore()
    const hydrateRequest = store.hydrate()

    setAdminToken('new-admin-token')
    store.token = 'new-admin-token'
    store.profile = nextAdminProfile

    profileRequest.reject(new Error('旧请求加载失败'))
    await hydrateRequest

    expect(store.token).toBe('new-admin-token')
    expect(store.profile).toEqual(nextAdminProfile)
    expect(store.error).toBeNull()
    expect(getAdminToken()).toBe('new-admin-token')
  })

  it('ignores a hydrate auth failure after a newer admin login starts', async () => {
    const hydrateProfileRequest = createDeferred<typeof adminProfile>()
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    const nextAdminProfile = {
      id: 3,
      username: 'new-admin',
      nickname: 'New Admin',
    }
    setUserToken('user-token')
    setAdminToken('old-admin-token')
    getAdminProfileMock
      .mockReturnValueOnce(hydrateProfileRequest.promise)
      .mockResolvedValueOnce(nextAdminProfile)
    loginAdminMock.mockReturnValueOnce(loginRequest.promise)

    const store = useAdminAuthStore()
    const hydrateRequest = store.hydrate()
    const login = store.login({
      account: 'new-admin',
      password: 'secret',
    })

    hydrateProfileRequest.reject(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))
    await hydrateRequest

    try {
      expect(store.loading).toBe(true)
      expect(store.error).toBeNull()
      expect(store.token).toBe('old-admin-token')
      expect(getAdminToken()).toBe('old-admin-token')
      expect(getUserToken()).toBe('user-token')
    } finally {
      loginRequest.resolve({ token: 'new-admin-token' })
      await login
    }

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.token).toBe('new-admin-token')
    expect(store.profile).toEqual(nextAdminProfile)
    expect(getAdminToken()).toBe('new-admin-token')
    expect(getUserToken()).toBe('user-token')
  })

  it('ignores hydrate profile data after a newer admin login starts', async () => {
    const hydrateProfileRequest = createDeferred<typeof adminProfile>()
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    const oldAdminProfile = {
      id: 2,
      username: 'old-admin',
      nickname: 'Old Admin',
    }
    const nextAdminProfile = {
      id: 3,
      username: 'new-admin',
      nickname: 'New Admin',
    }
    setUserToken('user-token')
    setAdminToken('old-admin-token')
    getAdminProfileMock
      .mockReturnValueOnce(hydrateProfileRequest.promise)
      .mockResolvedValueOnce(nextAdminProfile)
    loginAdminMock.mockReturnValueOnce(loginRequest.promise)

    const store = useAdminAuthStore()
    const hydrateRequest = store.hydrate()
    const login = store.login({
      account: 'new-admin',
      password: 'secret',
    })

    hydrateProfileRequest.resolve(oldAdminProfile)
    await hydrateRequest

    try {
      expect(store.loading).toBe(true)
      expect(store.error).toBeNull()
      expect(store.profile).toBeNull()
      expect(store.token).toBe('old-admin-token')
      expect(getAdminToken()).toBe('old-admin-token')
      expect(getUserToken()).toBe('user-token')
    } finally {
      loginRequest.resolve({ token: 'new-admin-token' })
      await login
    }

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.token).toBe('new-admin-token')
    expect(store.profile).toEqual(nextAdminProfile)
    expect(getAdminToken()).toBe('new-admin-token')
    expect(getUserToken()).toBe('user-token')
  })

  it('does not let a hydrate auth failure invalidate a pending admin login', async () => {
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    const hydrateProfileRequest = createDeferred<typeof adminProfile>()
    const nextAdminProfile = {
      id: 3,
      username: 'new-admin',
      nickname: 'New Admin',
    }
    setUserToken('user-token')
    setAdminToken('old-admin-token')
    loginAdminMock.mockReturnValueOnce(loginRequest.promise)
    getAdminProfileMock
      .mockReturnValueOnce(hydrateProfileRequest.promise)
      .mockResolvedValueOnce(nextAdminProfile)

    const store = useAdminAuthStore()
    const login = store.login({
      account: 'new-admin',
      password: 'secret',
    })
    const hydrateRequest = store.hydrate()

    hydrateProfileRequest.reject(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))
    await hydrateRequest

    try {
      expect(store.loading).toBe(true)
      expect(store.error).toBeNull()
      expect(store.token).toBe('old-admin-token')
      expect(getAdminToken()).toBe('old-admin-token')
      expect(getUserToken()).toBe('user-token')
    } finally {
      loginRequest.resolve({ token: 'new-admin-token' })
      await login
    }

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.token).toBe('new-admin-token')
    expect(store.profile).toEqual(nextAdminProfile)
    expect(getAdminToken()).toBe('new-admin-token')
    expect(getUserToken()).toBe('user-token')
  })
})
