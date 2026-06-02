// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ApiError } from '../../src/server/errors'
import { errorResponse, okResponse } from '../../src/server/response'

describe('backend response helpers', () => {
  it('wraps successful data in the frontend API contract', () => {
    const response = okResponse({ id: 1 })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({
      code: 0,
      message: 'ok',
      data: { id: 1 },
    })
  })

  it('wraps ApiError in the frontend API contract', () => {
    const response = errorResponse(new ApiError(401, '登录已过期，请重新登录'))

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body)).toEqual({
      code: 401,
      message: '登录已过期，请重新登录',
      data: null,
    })
  })

  it('wraps validation errors as bad requests instead of server errors', () => {
    const result = z.object({
      email: z.string().email('请输入有效邮箱'),
    }).safeParse({ email: 'not-an-email' })

    expect(result.success).toBe(false)

    if (!result.success) {
      const response = errorResponse(result.error)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({
        code: 400,
        message: '请输入有效邮箱',
        data: null,
      })
    }
  })
})
