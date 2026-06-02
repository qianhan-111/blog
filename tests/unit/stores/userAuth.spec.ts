import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  getCurrentUserProfile,
  loginUser,
  logoutUser,
  registerUser,
} from '@/api/profile'
import { HttpClientError } from '@/api/client'
import { useUserAuthStore } from '@/stores/userAuth'
import { getUserToken, setAdminToken, setUserToken } from '@/utils/auth-storage'

vi.mock('@/api/profile', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  updateCurrentUserProfile: vi.fn(),
  logoutUser: vi.fn(),
}))

const loginUserMock = vi.mocked(loginUser)
const registerUserMock = vi.mocked(registerUser)
const getCurrentUserProfileMock = vi.mocked(getCurrentUserProfile)
const logoutUserMock = vi.mocked(logoutUser)

const profile = {
  id: 9,
  username: 'writer',
  email: 'writer@example.com',
  nickname: 'Writer',
  avatarUrl: '/avatar.png',
  bio: 'Hello',
  role: 'author' as const,
  status: 'enabled' as const,
  createdAt: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
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

describe('user auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    loginUserMock.mockReset()
    registerUserMock.mockReset()
    getCurrentUserProfileMock.mockReset()
    logoutUserMock.mockReset()
  })

  it('stores token and profile after a successful login', async () => {
    loginUserMock.mockResolvedValue({
      token: 'user-token',
    })
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const store = useUserAuthStore()

    await store.login({
      account: 'writer',
      password: 'secret',
    })

    expect(getUserToken()).toBe('user-token')
    expect(store.token).toBe('user-token')
    expect(store.profile).toEqual(profile)
    expect(store.error).toBeNull()
  })

  it('clears token and profile on logout without touching the admin token', async () => {
    loginUserMock.mockResolvedValue({
      token: 'user-token',
    })
    getCurrentUserProfileMock.mockResolvedValue(profile)
    logoutUserMock.mockResolvedValue(null)
    setAdminToken('admin-token')

    const store = useUserAuthStore()
    await store.login({
      account: 'writer',
      password: 'secret',
    })

    await store.logout()

    expect(getUserToken()).toBeNull()
    expect(sessionStorage.getItem('blog.admin.token')).toBe('admin-token')
    expect(localStorage.getItem('blog.admin.token')).toBeNull()
    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
  })

  it('registers through the api and then hydrates a logged-in session', async () => {
    registerUserMock.mockResolvedValue({
      token: 'registered-token',
    })
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const store = useUserAuthStore()

    await store.register({
      username: 'writer',
      email: 'writer@example.com',
      password: 'secret',
      confirmPassword: 'secret',
    })

    expect(registerUserMock).toHaveBeenCalledWith({
      username: 'writer',
      email: 'writer@example.com',
      password: 'secret',
      confirmPassword: 'secret',
    })
    expect(store.token).toBe('registered-token')
    expect(store.profile).toEqual(profile)
  })

  it('surfaces login errors and leaves the session empty', async () => {
    loginUserMock.mockRejectedValue(new Error('账号已禁用'))

    const store = useUserAuthStore()

    await expect(
      store.login({
        account: 'disabled@example.com',
        password: 'secret',
      }),
    ).rejects.toThrow('账号已禁用')

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBe('账号已禁用')
  })

  it('keeps the new user token when login succeeds but profile loading times out', async () => {
    loginUserMock.mockResolvedValue({
      token: 'user-token',
    })
    getCurrentUserProfileMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const store = useUserAuthStore()

    await expect(
      store.login({
        account: 'writer',
        password: 'secret',
      }),
    ).rejects.toThrow('请求超时，请稍后重试')

    expect(store.token).toBe('user-token')
    expect(store.profile).toBeNull()
    expect(store.error).toBe('请求超时，请稍后重试')
    expect(getUserToken()).toBe('user-token')
  })

  it('ignores an older login response after a newer login succeeds', async () => {
    const olderLoginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    const newerLoginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    const olderProfile = {
      ...profile,
      id: 10,
      username: 'old-writer',
      email: 'old-writer@example.com',
      nickname: 'Old Writer',
    }
    const newerProfile = {
      ...profile,
      id: 11,
      username: 'new-writer',
      email: 'new-writer@example.com',
      nickname: 'New Writer',
    }

    loginUserMock
      .mockReturnValueOnce(olderLoginRequest.promise)
      .mockReturnValueOnce(newerLoginRequest.promise)
    getCurrentUserProfileMock
      .mockResolvedValueOnce(newerProfile)
      .mockResolvedValueOnce(olderProfile)

    const store = useUserAuthStore()
    const olderLogin = store.login({
      account: 'old-writer',
      password: 'secret',
    })
    const newerLogin = store.login({
      account: 'new-writer',
      password: 'secret',
    })

    newerLoginRequest.resolve({ token: 'new-user-token' })
    await newerLogin

    olderLoginRequest.resolve({ token: 'old-user-token' })
    await olderLogin

    expect(store.token).toBe('new-user-token')
    expect(store.profile).toEqual(newerProfile)
    expect(store.error).toBeNull()
    expect(getUserToken()).toBe('new-user-token')
  })

  it('does not clear a newer user session after an older login request fails', async () => {
    const olderLoginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    const newerLoginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    const newerProfile = {
      ...profile,
      id: 11,
      username: 'new-writer',
      email: 'new-writer@example.com',
      nickname: 'New Writer',
    }

    loginUserMock
      .mockReturnValueOnce(olderLoginRequest.promise)
      .mockReturnValueOnce(newerLoginRequest.promise)
    getCurrentUserProfileMock.mockResolvedValueOnce(newerProfile)

    const store = useUserAuthStore()
    const olderLogin = store.login({
      account: 'old-writer',
      password: 'secret',
    })
    const newerLogin = store.login({
      account: 'new-writer',
      password: 'secret',
    })

    newerLoginRequest.resolve({ token: 'new-user-token' })
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

    expect(store.token).toBe('new-user-token')
    expect(store.profile).toEqual(newerProfile)
    expect(store.error).toBeNull()
    expect(getUserToken()).toBe('new-user-token')
  })

  it('ignores a login response after logout clears the session', async () => {
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    loginUserMock.mockReturnValueOnce(loginRequest.promise)
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const store = useUserAuthStore()
    const login = store.login({
      account: 'writer',
      password: 'secret',
    })

    await store.logout()

    loginRequest.resolve({ token: 'user-token' })
    await login

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBeNull()
    expect(getUserToken()).toBeNull()
    expect(getCurrentUserProfileMock).not.toHaveBeenCalled()
  })

  it('ignores an older registration response after a newer registration succeeds', async () => {
    const olderRegisterRequest = createDeferred<Awaited<ReturnType<typeof registerUser>>>()
    const newerRegisterRequest = createDeferred<Awaited<ReturnType<typeof registerUser>>>()
    const newerProfile = {
      ...profile,
      id: 11,
      username: 'new-writer',
      email: 'new-writer@example.com',
      nickname: 'New Writer',
    }

    registerUserMock
      .mockReturnValueOnce(olderRegisterRequest.promise)
      .mockReturnValueOnce(newerRegisterRequest.promise)
    getCurrentUserProfileMock.mockResolvedValueOnce(newerProfile)

    const store = useUserAuthStore()
    const olderRegister = store.register({
      username: 'old-writer',
      email: 'old-writer@example.com',
      password: 'secret',
      confirmPassword: 'secret',
    })
    const newerRegister = store.register({
      username: 'new-writer',
      email: 'new-writer@example.com',
      password: 'secret',
      confirmPassword: 'secret',
    })

    newerRegisterRequest.resolve({ token: 'new-user-token' })
    await newerRegister

    olderRegisterRequest.resolve({ token: 'old-user-token' })
    await olderRegister

    expect(store.token).toBe('new-user-token')
    expect(store.profile).toEqual(newerProfile)
    expect(store.error).toBeNull()
    expect(getUserToken()).toBe('new-user-token')
  })

  it('ignores a registration response after logout clears the session', async () => {
    const registerRequest = createDeferred<Awaited<ReturnType<typeof registerUser>>>()
    registerUserMock.mockReturnValueOnce(registerRequest.promise)
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const store = useUserAuthStore()
    const register = store.register({
      username: 'writer',
      email: 'writer@example.com',
      password: 'secret',
      confirmPassword: 'secret',
    })

    await store.logout()

    registerRequest.resolve({ token: 'user-token' })
    await register

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBeNull()
    expect(getUserToken()).toBeNull()
    expect(getCurrentUserProfileMock).not.toHaveBeenCalled()
  })

  it('clears the new user token when login profile loading confirms session expiration', async () => {
    loginUserMock.mockResolvedValue({
      token: 'user-token',
    })
    getCurrentUserProfileMock.mockRejectedValue(
      new HttpClientError({
        code: 401,
        kind: 'http',
        message: '登录已过期，请重新登录',
        retryable: false,
        shouldReport: false,
        status: 401,
      }),
    )

    const store = useUserAuthStore()

    await expect(
      store.login({
        account: 'writer',
        password: 'secret',
      }),
    ).rejects.toThrow('登录已过期，请重新登录')

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBe('登录已过期，请重新登录')
    expect(getUserToken()).toBeNull()
  })

  it('clears only the user session when hydrate fails and preserves the admin token', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    getCurrentUserProfileMock.mockRejectedValue(new Error('登录已失效'))

    const store = useUserAuthStore()

    await expect(store.hydrate()).resolves.toBeNull()

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBe('登录已失效')
    expect(getUserToken()).toBeNull()
    expect(sessionStorage.getItem('blog.admin.token')).toBe('admin-token')
    expect(localStorage.getItem('blog.admin.token')).toBeNull()
  })

  it('clears hydrate loading after a confirmed user session failure', async () => {
    setUserToken('user-token')
    getCurrentUserProfileMock.mockRejectedValue(
      new HttpClientError({
        code: 401,
        kind: 'http',
        message: '登录已过期，请重新登录',
        retryable: false,
        shouldReport: false,
        status: 401,
      }),
    )

    const store = useUserAuthStore()

    await expect(store.hydrate()).resolves.toBeNull()

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBe('登录已过期，请重新登录')
    expect(store.loading).toBe(false)
  })

  it('keeps the user token when hydrate fails with a retryable network error', async () => {
    setUserToken('user-token')
    getCurrentUserProfileMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    const store = useUserAuthStore()

    await expect(store.hydrate()).resolves.toBeNull()

    expect(store.token).toBe('user-token')
    expect(store.profile).toBeNull()
    expect(store.error).toBe('网络连接失败，请检查网络或后端服务')
    expect(getUserToken()).toBe('user-token')
  })

  it('clears the user session when hydrate finds the account disabled', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    getCurrentUserProfileMock.mockRejectedValue(
      new HttpClientError({
        code: 403,
        kind: 'http',
        message: '账号已被禁用',
        retryable: false,
        shouldReport: false,
        status: 403,
      }),
    )

    const store = useUserAuthStore()

    await expect(store.hydrate()).resolves.toBeNull()

    expect(store.token).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.error).toBe('账号已被禁用')
    expect(getUserToken()).toBeNull()
    expect(sessionStorage.getItem('blog.admin.token')).toBe('admin-token')
  })

  it('keeps the user session when a confirmed auth failure belongs to an older token', () => {
    setUserToken('new-user-token')
    setAdminToken('admin-token')
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

    const store = useUserAuthStore()
    store.token = 'new-user-token'
    store.profile = profile

    expect(store.clearSessionIfConfirmedFailure(staleAuthError)).toBe(false)
    expect(store.token).toBe('new-user-token')
    expect(store.profile).toEqual(profile)
    expect(getUserToken()).toBe('new-user-token')
    expect(sessionStorage.getItem('blog.admin.token')).toBe('admin-token')
  })

  it('ignores profile data from a hydrate request started with an older token', async () => {
    const oldProfile = {
      ...profile,
      id: 10,
      username: 'old-writer',
      email: 'old-writer@example.com',
      nickname: 'Old Writer',
    }
    const nextProfile = {
      ...profile,
      id: 11,
      username: 'new-writer',
      email: 'new-writer@example.com',
      nickname: 'New Writer',
    }
    const profileRequest = createDeferred<typeof oldProfile>()
    setUserToken('old-user-token')
    getCurrentUserProfileMock.mockReturnValue(profileRequest.promise)

    const store = useUserAuthStore()
    const hydrateRequest = store.hydrate()

    expect(getCurrentUserProfileMock).toHaveBeenCalledTimes(1)

    setUserToken('new-user-token')
    store.token = 'new-user-token'
    store.profile = nextProfile

    profileRequest.resolve(oldProfile)
    await hydrateRequest

    expect(store.token).toBe('new-user-token')
    expect(store.profile).toEqual(nextProfile)
    expect(getUserToken()).toBe('new-user-token')
  })

  it('ignores profile errors from a hydrate request started with an older token', async () => {
    const nextProfile = {
      ...profile,
      id: 11,
      username: 'new-writer',
      email: 'new-writer@example.com',
      nickname: 'New Writer',
    }
    const profileRequest = createDeferred<typeof profile>()
    setUserToken('old-user-token')
    getCurrentUserProfileMock.mockReturnValue(profileRequest.promise)

    const store = useUserAuthStore()
    const hydrateRequest = store.hydrate()

    setUserToken('new-user-token')
    store.token = 'new-user-token'
    store.profile = nextProfile

    profileRequest.reject(new Error('旧请求加载失败'))
    await hydrateRequest

    expect(store.token).toBe('new-user-token')
    expect(store.profile).toEqual(nextProfile)
    expect(store.error).toBeNull()
    expect(getUserToken()).toBe('new-user-token')
  })

  it('ignores a hydrate auth failure after a newer login starts', async () => {
    const hydrateProfileRequest = createDeferred<typeof profile>()
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    const nextProfile = {
      ...profile,
      id: 11,
      username: 'new-writer',
      email: 'new-writer@example.com',
      nickname: 'New Writer',
    }
    setUserToken('old-user-token')
    getCurrentUserProfileMock
      .mockReturnValueOnce(hydrateProfileRequest.promise)
      .mockResolvedValueOnce(nextProfile)
    loginUserMock.mockReturnValueOnce(loginRequest.promise)

    const store = useUserAuthStore()
    const hydrateRequest = store.hydrate()
    const login = store.login({
      account: 'new-writer',
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
      expect(store.token).toBe('old-user-token')
      expect(getUserToken()).toBe('old-user-token')
    } finally {
      loginRequest.resolve({ token: 'new-user-token' })
      await login
    }

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.token).toBe('new-user-token')
    expect(store.profile).toEqual(nextProfile)
    expect(getUserToken()).toBe('new-user-token')
  })

  it('ignores hydrate profile data after a newer user login starts', async () => {
    const hydrateProfileRequest = createDeferred<typeof profile>()
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    const oldProfile = {
      ...profile,
      id: 10,
      username: 'old-writer',
      email: 'old-writer@example.com',
      nickname: 'Old Writer',
    }
    const nextProfile = {
      ...profile,
      id: 11,
      username: 'new-writer',
      email: 'new-writer@example.com',
      nickname: 'New Writer',
    }
    setUserToken('old-user-token')
    getCurrentUserProfileMock
      .mockReturnValueOnce(hydrateProfileRequest.promise)
      .mockResolvedValueOnce(nextProfile)
    loginUserMock.mockReturnValueOnce(loginRequest.promise)

    const store = useUserAuthStore()
    const hydrateRequest = store.hydrate()
    const login = store.login({
      account: 'new-writer',
      password: 'secret',
    })

    hydrateProfileRequest.resolve(oldProfile)
    await hydrateRequest

    try {
      expect(store.loading).toBe(true)
      expect(store.error).toBeNull()
      expect(store.profile).toBeNull()
      expect(store.token).toBe('old-user-token')
      expect(getUserToken()).toBe('old-user-token')
    } finally {
      loginRequest.resolve({ token: 'new-user-token' })
      await login
    }

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.token).toBe('new-user-token')
    expect(store.profile).toEqual(nextProfile)
    expect(getUserToken()).toBe('new-user-token')
  })

  it('does not let a hydrate auth failure invalidate a pending user login', async () => {
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    const hydrateProfileRequest = createDeferred<typeof profile>()
    const nextProfile = {
      ...profile,
      id: 11,
      username: 'new-writer',
      email: 'new-writer@example.com',
      nickname: 'New Writer',
    }
    setUserToken('old-user-token')
    loginUserMock.mockReturnValueOnce(loginRequest.promise)
    getCurrentUserProfileMock
      .mockReturnValueOnce(hydrateProfileRequest.promise)
      .mockResolvedValueOnce(nextProfile)

    const store = useUserAuthStore()
    const login = store.login({
      account: 'new-writer',
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
      expect(store.token).toBe('old-user-token')
      expect(getUserToken()).toBe('old-user-token')
    } finally {
      loginRequest.resolve({ token: 'new-user-token' })
      await login
    }

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.token).toBe('new-user-token')
    expect(store.profile).toEqual(nextProfile)
    expect(getUserToken()).toBe('new-user-token')
  })
})
