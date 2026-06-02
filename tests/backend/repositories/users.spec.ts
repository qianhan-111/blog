// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { listUsers } from '../../../src/server/repositories/users'
import type { SqlQuery } from '../../../src/server/db'

function createSqlMock(query: ReturnType<typeof vi.fn>) {
  return { query } as unknown as SqlQuery
}

describe('user repository database guards', () => {
  it('caps admin user list page sizes before querying the database', async () => {
    const queryParams: unknown[][] = []
    const query = vi.fn(async (statement: string, params: unknown[]) => {
      queryParams.push([...params])

      if (statement.includes('COUNT(*)')) {
        return [{ total: 51 }]
      }

      return []
    })

    const result = await listUsers({ page: 2, pageSize: 500 }, createSqlMock(query))

    expect(queryParams[1]).toEqual([50, 50])
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 50,
      total: 51,
      totalPages: 2,
    })
  })
})
