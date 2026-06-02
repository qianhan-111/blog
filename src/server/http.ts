import { ApiError } from './errors.js'
import type { VercelRequest } from './vercel-types.js'

function parsePositiveInteger(value: unknown): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
    return null
  }

  const text = String(rawValue)

  if (!/^\d+$/.test(text)) {
    return null
  }

  const parsed = Number(text)

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function assertMethod(request: VercelRequest, allowed: string[]): void {
  if (!request.method || !allowed.includes(request.method)) {
    throw new ApiError(405, '请求方法不支持', 405)
  }
}

export function getBearerToken(request: VercelRequest): string | null {
  const header = request.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim() || null
}

export function readIdFromPath(request: VercelRequest, prefix: string): number {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  const id = parsePositiveInteger(pathname.replace(prefix, '').split('/')[0] ?? '')

  if (id === null) {
    throw new ApiError(400, '无效的资源 ID')
  }

  return id
}

export function readNumericQueryParam(request: VercelRequest, name: string): number {
  const value = request.query[name]
  const id = parsePositiveInteger(value)

  if (id === null) {
    throw new ApiError(400, '无效的资源 ID')
  }

  return id
}

export function readRouteId(request: VercelRequest, queryName: string, pathPrefix: string): number {
  const queryValue = request.query[queryName]

  if (queryValue !== undefined) {
    return readNumericQueryParam(request, queryName)
  }

  return readIdFromPath(request, pathPrefix)
}

export function readJsonBody<T = unknown>(request: VercelRequest): T {
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body) as T
    } catch {
      throw new ApiError(400, '请求体不是有效 JSON')
    }
  }

  return request.body as T
}
