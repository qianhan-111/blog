import { vi } from 'vitest'

import type { VercelRequest, VercelResponse } from '../../../src/server/vercel-types'

export function createMockRequest(options: {
  body?: unknown
  headers?: Record<string, string>
  method?: string
  query?: Record<string, string | string[]>
  url?: string
} = {}) {
  return {
    body: options.body,
    headers: options.headers ?? {},
    method: options.method ?? 'GET',
    query: options.query ?? {},
    url: options.url ?? '/',
  } as unknown as VercelRequest
}

export function createApiRequest(url: string, options: Parameters<typeof createMockRequest>[0] = {}) {
  return createMockRequest({
    ...options,
    url,
  })
}

export function createMockResponse() {
  const response = {
    body: '',
    headers: {} as Record<string, string>,
    statusCode: 0,
    send: vi.fn((body: string) => {
      response.body = body
      return response
    }),
    setHeader: vi.fn((key: string, value: string) => {
      response.headers[key] = value
      return response
    }),
    status: vi.fn((statusCode: number) => {
      response.statusCode = statusCode
      return response
    }),
  }

  return response as unknown as VercelResponse & typeof response
}

export function readJsonResponse(response: ReturnType<typeof createMockResponse>) {
  return JSON.parse(response.body) as {
    code: number
    message: string
    data: unknown
  }
}
