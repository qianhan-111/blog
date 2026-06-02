import { ZodError } from 'zod'

import { ApiError } from './errors.js'
import type { VercelResponse } from './vercel-types.js'

interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export interface ResponsePayload {
  statusCode: number
  headers: Record<string, string>
  body: string
}

function jsonPayload<T>(statusCode: number, body: ApiResult<T>): ResponsePayload {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  }
}

export function okResponse<T>(data: T, message = 'ok'): ResponsePayload {
  return jsonPayload(200, {
    code: 0,
    message,
    data,
  })
}

export function errorResponse(error: unknown): ResponsePayload {
  if (error instanceof ApiError) {
    return jsonPayload(error.status, {
      code: error.code,
      message: error.message,
      data: null,
    })
  }

  if (error instanceof ZodError) {
    return jsonPayload(400, {
      code: 400,
      message: error.issues[0]?.message ?? '请求参数不正确',
      data: null,
    })
  }

  return jsonPayload(500, {
    code: 500,
    message: '服务器暂时不可用，请稍后重试',
    data: null,
  })
}

export function sendPayload(response: VercelResponse, payload: ResponsePayload): void {
  for (const [key, value] of Object.entries(payload.headers)) {
    response.setHeader(key, value)
  }

  response.status(payload.statusCode).send(payload.body)
}
