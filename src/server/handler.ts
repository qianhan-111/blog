import { errorResponse, okResponse, sendPayload } from './response.js'
import type { VercelRequest, VercelResponse } from './vercel-types.js'

export type ApiHandler<T> = (request: VercelRequest) => Promise<T> | T

export function createApiHandler<T>(handler: ApiHandler<T>) {
  return async function apiHandler(request: VercelRequest, response: VercelResponse) {
    try {
      sendPayload(response, okResponse(await handler(request)))
    } catch (error) {
      sendPayload(response, errorResponse(error))
    }
  }
}
