// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { readIdFromPath, readRouteId, readNumericQueryParam } from '../../src/server/http'
import type { VercelRequest } from '../../src/server/vercel-types'

function createRequest(url: string, query: VercelRequest['query'] = {}) {
  return {
    query,
    url,
  } as VercelRequest
}

describe('server HTTP helpers', () => {
  it('rejects path ids that only start with a number', () => {
    expect(() => readIdFromPath(createRequest('/api/articles/12abc'), '/api/articles/')).toThrow('无效的资源 ID')
  })

  it('rejects numeric query params that only start with a number', () => {
    expect(() => readNumericQueryParam(createRequest('/api/articles/prev-next', { articleId: '12abc' }), 'articleId')).toThrow(
      '无效的资源 ID',
    )
  })

  it('falls back to the URL path when a dynamic route id is missing from query params', () => {
    expect(readRouteId(createRequest('/api/articles/42'), 'id', '/api/articles/')).toBe(42)
  })

  it('reads the route id from nested dynamic URL paths', () => {
    expect(readRouteId(createRequest('/api/articles/42/prev-next'), 'id', '/api/articles/')).toBe(42)
  })

  it('prefers the query id when Vercel provides one for a dynamic route', () => {
    expect(readRouteId(createRequest('/api/articles/42', { id: '7' }), 'id', '/api/articles/')).toBe(7)
  })
})
