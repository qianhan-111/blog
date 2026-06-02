import { AxiosError, type AxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

const reportHttpFailure = vi.fn()

vi.mock('@/observability', () => ({
  reportHttpFailure,
}))

describe('api client observability integration', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('reports retryable timeout failures to observability', async () => {
    const { createHttpClient } = await import('@/api/client')
    const client = createHttpClient('public')

    await expect(
      client.get('/articles', {
        adapter: async (config: AxiosRequestConfig) => {
          throw new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED', config)
        },
      }),
    ).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
      shouldReport: true,
    })

    expect(reportHttpFailure).toHaveBeenCalledTimes(1)
    expect(reportHttpFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'timeout',
        shouldReport: true,
      }),
      expect.objectContaining({
        method: 'get',
        url: '/articles',
      }),
    )
  })
})
