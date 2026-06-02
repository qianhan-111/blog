import type { App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { initObservability, reportHttpFailure, reportRouteError } from '@/observability'

describe('observability', () => {
  const endpoint = 'https://observability.example.com/ingest'
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not send reports when disabled', async () => {
    const app = { config: {} } as App

    initObservability(app, {
      enabled: false,
      endpoint,
      release: 'test-release',
    })

    reportRouteError(new Error('route failed'), { to: '/admin/login' })
    reportHttpFailure(
      {
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
        status: 504,
      },
      { method: 'get', url: '/articles' },
    )

    await Promise.resolve()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends route failure events with context when enabled', async () => {
    const app = { config: {} } as App

    initObservability(app, {
      enabled: true,
      endpoint,
      release: 'sha-123',
    })

    reportRouteError(new Error('route failed'), {
      from: '/',
      to: '/writer/articles',
    })

    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(endpoint)

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(payload).toMatchObject({
      event: 'route_error',
      message: 'route failed',
      release: 'sha-123',
      context: {
        from: '/',
        to: '/writer/articles',
      },
    })
  })

  it('registers app and window error handlers during initialization', () => {
    const app = { config: {} } as App
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    initObservability(app, {
      enabled: true,
      endpoint,
      release: 'sha-456',
    })

    expect(typeof app.config.errorHandler).toBe('function')
    expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
  })

  it('registers router error reporting during initialization', async () => {
    const app = { config: {} } as App
    let routeErrorHandler: ((error: Error) => void) | undefined
    const router = {
      currentRoute: {
        value: {
          fullPath: '/writer/articles',
        },
      },
      onError: vi.fn((handler: (error: Error) => void) => {
        routeErrorHandler = handler
        return () => undefined
      }),
    }

    initObservability(app, {
      enabled: true,
      endpoint,
      release: 'sha-789',
      router,
    })

    expect(router.onError).toHaveBeenCalledTimes(1)

    routeErrorHandler?.(new Error('router crashed'))
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))

    expect(payload).toMatchObject({
      event: 'route_error',
      message: 'router crashed',
      context: {
        to: '/writer/articles',
      },
    })
  })
})
