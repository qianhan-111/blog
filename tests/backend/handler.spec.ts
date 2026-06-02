// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../src/server/errors'
import { createApiHandler } from '../../src/server/handler'
import type { VercelRequest, VercelResponse } from '../../src/server/vercel-types'

function createResponse() {
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

describe('createApiHandler', () => {
  it('wraps successful handlers in the API response contract', async () => {
    const handler = createApiHandler(() => ({ status: 'ok' }))
    const response = createResponse()

    await handler({} as VercelRequest, response)

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({
      code: 0,
      message: 'ok',
      data: { status: 'ok' },
    })
  })

  it('turns ApiError into a matching JSON response', async () => {
    const handler = createApiHandler(() => {
      throw new ApiError(403, '没有访问权限')
    })
    const response = createResponse()

    await handler({} as VercelRequest, response)

    expect(response.statusCode).toBe(403)
    expect(JSON.parse(response.body)).toEqual({
      code: 403,
      message: '没有访问权限',
      data: null,
    })
  })

  it('turns unknown errors into 500 responses', async () => {
    const handler = createApiHandler(() => {
      throw new Error('boom')
    })
    const response = createResponse()

    await handler({} as VercelRequest, response)

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response.body)).toEqual({
      code: 500,
      message: '服务器暂时不可用，请稍后重试',
      data: null,
    })
  })
})
