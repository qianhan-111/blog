import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'

import { createHttpClient } from '@/api/client'
import {
  getAdminToken,
  getUserToken,
  setAdminToken,
  setUserToken,
} from '@/utils/auth-storage'

function createAdapter<T>(data: unknown) {
  return async (config: AxiosRequestConfig): Promise<AxiosResponse<T>> => ({
    config,
    data: data as T,
    headers: {},
    status: 200,
    statusText: 'OK',
  })
}

describe('shared api client', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('uses the base URL from VITE_API_BASE_URL', () => {
    const client = createHttpClient('public')

    expect(client.defaults.baseURL).toBe(import.meta.env.VITE_API_BASE_URL)
  })

  it('applies the default timeout for read requests', async () => {
    const client = createHttpClient('public')
    let requestTimeout: number | undefined

    await client.get('/articles', {
      adapter: async (config) => {
        requestTimeout = config.timeout

        return {
          config,
          data: {
            code: 0,
            message: 'ok',
            data: { ok: true },
          },
          headers: {},
          status: 200,
          statusText: 'OK',
        }
      },
    })

    expect(requestTimeout).toBe(10_000)
  })

  it('classifies timeout failures as retryable timeout errors', async () => {
    const client = createHttpClient('public')

    await expect(
      client.get('/articles', {
        adapter: async (config) => {
          throw new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED', config)
        },
      }),
    ).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
      shouldReport: true,
      message: '请求超时，请稍后重试',
    })
  })

  it('classifies canceled requests without reporting them', async () => {
    const client = createHttpClient('public')

    await expect(
      client.get('/articles', {
        adapter: async (config) => {
          throw new AxiosError('canceled', 'ERR_CANCELED', config)
        },
      }),
    ).rejects.toMatchObject({
      kind: 'canceled',
      retryable: false,
      shouldReport: false,
      message: '请求已取消',
    })
  })

  it('adds Authorization for user requests', async () => {
    setUserToken('user-token')
    const client = createHttpClient('user')
    let authHeader: unknown

    const result = await client.get('/profile', {
      adapter: async (config) => {
        authHeader = config.headers?.Authorization

        return {
          config,
          data: {
            code: 0,
            message: 'ok',
            data: { ok: true },
          },
          headers: {},
          status: 200,
          statusText: 'OK',
        }
      },
    })

    expect(authHeader).toBe('Bearer user-token')
    expect(result).toEqual({ ok: true })
  })

  it('lets admin requests use the admin token', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    const client = createHttpClient('admin')

    let authHeader: unknown

    await client.get('/admin/users', {
      adapter: async (config) => {
        authHeader = config.headers?.Authorization

        return {
          config,
          data: {
            code: 0,
            message: 'ok',
            data: { ok: true },
          },
          headers: {},
          status: 200,
          statusText: 'OK',
        }
      },
    })

    expect(authHeader).toBe('Bearer admin-token')
  })

  it('unwraps response data from the API contract', async () => {
    const client = createHttpClient('public')

    const result = await client.get('/articles', {
      adapter: createAdapter({
        code: 0,
        message: 'ok',
        data: {
          items: [{ id: 1 }],
          total: 1,
        },
      }),
    })

    expect(result).toEqual({
      items: [{ id: 1 }],
      total: 1,
    })
  })

  it('rejects with the API message when code is non-zero', async () => {
    const client = createHttpClient('public')

    await expect(
      client.get('/articles', {
        adapter: createAdapter({
          code: 4001,
          message: 'invalid session',
          data: null,
        }),
      }),
    ).rejects.toThrow('invalid session')
  })

  it('normalizes malformed successful responses before they reach UI state', async () => {
    const client = createHttpClient('public')

    await expect(
      client.get('/articles', {
        adapter: createAdapter(null),
      }),
    ).rejects.toMatchObject({
      kind: 'http',
      message: '请求失败，请稍后重试',
      retryable: true,
      shouldReport: true,
      status: 200,
    })
  })

  it('normalizes network failures before they reach UI state', async () => {
    const client = createHttpClient('public')

    await expect(
      client.get('/articles', {
        adapter: async (config) => {
          throw new AxiosError('Network Error', 'ERR_NETWORK', config)
        },
      }),
    ).rejects.toThrow('网络连接失败')
  })

  it('normalizes malformed error response messages before they reach UI state', async () => {
    const client = createHttpClient('public')

    await expect(
      client.get('/articles', {
        adapter: async (config) => {
          throw new AxiosError(
            'Request failed with status code 500',
            'ERR_BAD_RESPONSE',
            config,
            undefined,
            {
              config,
              data: {
                code: 500,
                data: null,
                message: { detail: 'upstream returned a malformed error' },
              } as unknown as never,
              headers: {},
              status: 500,
              statusText: 'Internal Server Error',
            },
          )
        },
      }),
    ).rejects.toMatchObject({
      kind: 'http',
      message: '服务暂时不可用，请稍后重试',
      retryable: true,
      shouldReport: true,
      status: 500,
    })
  })

  it('clears only the user token and redirects to /login with the current path on confirmed user 401', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    const requestedPath = '/writer/articles/101/edit?mode=preview&tab=outline'
    window.history.replaceState({}, '', requestedPath)
    let historyNotified = false
    const markHistoryNotified = () => {
      historyNotified = true
    }
    window.addEventListener('popstate', markHistoryNotified)

    const client = createHttpClient('user')

    try {
      await expect(
        client.get('/author/articles', {
          adapter: async (config) => ({
            config,
            data: {
              code: 401,
              message: '登录已失效',
              data: null,
            },
            headers: {},
            status: 401,
            statusText: 'Unauthorized',
          }),
        }),
      ).rejects.toThrow('登录已失效')
    } finally {
      window.removeEventListener('popstate', markHistoryNotified)
    }

    expect(getUserToken()).toBeNull()
    expect(getAdminToken()).toBe('admin-token')
    expect(window.location.pathname).toBe('/login')
    expect(new URLSearchParams(window.location.search).get('redirect')).toBe(requestedPath)
    expect(historyNotified).toBe(true)
  })

  it('keeps a newer user token when an older user request later receives a confirmed 401', async () => {
    setUserToken('old-user-token')
    const requestedPath = '/writer/articles'
    window.history.replaceState({}, '', requestedPath)
    let historyNotified = false
    const markHistoryNotified = () => {
      historyNotified = true
    }
    window.addEventListener('popstate', markHistoryNotified)

    const client = createHttpClient('user')
    let authHeader: unknown

    try {
      await expect(
        client.get('/author/articles', {
          adapter: async (config) => {
            authHeader = config.headers?.Authorization
            setUserToken('new-user-token')

            return {
              config,
              data: {
                code: 401,
                message: '登录已失效',
                data: null,
              },
              headers: {},
              status: 401,
              statusText: 'Unauthorized',
            }
          },
        }),
      ).rejects.toThrow('登录已失效')
    } finally {
      window.removeEventListener('popstate', markHistoryNotified)
    }

    expect(authHeader).toBe('Bearer old-user-token')
    expect(getUserToken()).toBe('new-user-token')
    expect(window.location.pathname).toBe('/writer/articles')
    expect(historyNotified).toBe(false)
  })

  it('clears only the user token and redirects to /login with the current path when the user account is disabled', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    const requestedPath = '/profile?tab=settings&section=password'
    window.history.replaceState({}, '', requestedPath)
    let historyNotified = false
    const markHistoryNotified = () => {
      historyNotified = true
    }
    window.addEventListener('popstate', markHistoryNotified)

    const client = createHttpClient('user')

    try {
      await expect(
        client.get('/author/articles', {
          adapter: async (config) => ({
            config,
            data: {
              code: 403,
              message: '账号已被禁用',
              data: null,
            },
            headers: {},
            status: 403,
            statusText: 'Forbidden',
          }),
        }),
      ).rejects.toThrow('账号已被禁用')
    } finally {
      window.removeEventListener('popstate', markHistoryNotified)
    }

    expect(getUserToken()).toBeNull()
    expect(getAdminToken()).toBe('admin-token')
    expect(window.location.pathname).toBe('/login')
    expect(new URLSearchParams(window.location.search).get('redirect')).toBe(requestedPath)
    expect(historyNotified).toBe(true)
  })

  it('clears only the admin token and redirects to /admin/login with the current path on confirmed admin 401', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    const requestedPath = '/admin/users?page=2&keyword=alice'
    window.history.replaceState({}, '', requestedPath)
    let historyNotified = false
    const markHistoryNotified = () => {
      historyNotified = true
    }
    window.addEventListener('popstate', markHistoryNotified)

    const client = createHttpClient('admin')

    try {
      await expect(
        client.get('/admin/users', {
          adapter: async (config) => ({
            config,
            data: {
              code: 401,
              message: '管理员登录已失效',
              data: null,
            },
            headers: {},
            status: 401,
            statusText: 'Unauthorized',
          }),
        }),
      ).rejects.toThrow('管理员登录已失效')
    } finally {
      window.removeEventListener('popstate', markHistoryNotified)
    }

    expect(getAdminToken()).toBeNull()
    expect(getUserToken()).toBe('user-token')
    expect(window.location.pathname).toBe('/admin/login')
    expect(new URLSearchParams(window.location.search).get('redirect')).toBe(requestedPath)
    expect(historyNotified).toBe(true)
  })

  it('keeps a newer admin token when an older admin request later receives a confirmed 401', async () => {
    setAdminToken('old-admin-token')
    const requestedPath = '/admin/users'
    window.history.replaceState({}, '', requestedPath)
    let historyNotified = false
    const markHistoryNotified = () => {
      historyNotified = true
    }
    window.addEventListener('popstate', markHistoryNotified)

    const client = createHttpClient('admin')
    let authHeader: unknown

    try {
      await expect(
        client.get('/admin/users', {
          adapter: async (config) => {
            authHeader = config.headers?.Authorization
            setAdminToken('new-admin-token')

            return {
              config,
              data: {
                code: 401,
                message: '管理员登录已失效',
                data: null,
              },
              headers: {},
              status: 401,
              statusText: 'Unauthorized',
            }
          },
        }),
      ).rejects.toThrow('管理员登录已失效')
    } finally {
      window.removeEventListener('popstate', markHistoryNotified)
    }

    expect(authHeader).toBe('Bearer old-admin-token')
    expect(getAdminToken()).toBe('new-admin-token')
    expect(window.location.pathname).toBe('/admin/users')
    expect(historyNotified).toBe(false)
  })

  it('clears only the admin token and redirects to /admin/login with the current path when the admin account is disabled', async () => {
    setUserToken('user-token')
    setAdminToken('admin-token')
    const requestedPath = '/admin/articles?status=draft&page=3'
    window.history.replaceState({}, '', requestedPath)
    let historyNotified = false
    const markHistoryNotified = () => {
      historyNotified = true
    }
    window.addEventListener('popstate', markHistoryNotified)

    const client = createHttpClient('admin')

    try {
      await expect(
        client.get('/admin/users', {
          adapter: async (config) => ({
            config,
            data: {
              code: 403,
              message: '账号已被禁用',
              data: null,
            },
            headers: {},
            status: 403,
            statusText: 'Forbidden',
          }),
        }),
      ).rejects.toThrow('账号已被禁用')
    } finally {
      window.removeEventListener('popstate', markHistoryNotified)
    }

    expect(getAdminToken()).toBeNull()
    expect(getUserToken()).toBe('user-token')
    expect(window.location.pathname).toBe('/admin/login')
    expect(new URLSearchParams(window.location.search).get('redirect')).toBe(requestedPath)
    expect(historyNotified).toBe(true)
  })
})
