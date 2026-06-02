import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { getTags } from '@/api/tags'
import { useTagsStore } from '@/stores/tags'
import type { Tag } from '@/types/tag'

vi.mock('@/api/tags', () => ({
  getTags: vi.fn(),
}))

const getTagsMock = vi.mocked(getTags)

const tag: Tag = {
  id: 1,
  name: 'vue',
  createdAt: '2026-05-12T00:00:00.000Z',
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return {
    promise,
    reject,
    resolve,
  }
}

describe('tags store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getTagsMock.mockReset()
  })

  it('fetches once and caches the list', async () => {
    getTagsMock.mockResolvedValue([tag])

    const store = useTagsStore()

    await store.fetchAll()
    await store.fetchAll()

    expect(getTagsMock).toHaveBeenCalledTimes(1)
    expect(store.items).toEqual([tag])
  })

  it('retries after a failure', async () => {
    getTagsMock
      .mockRejectedValueOnce(new Error('Failed to load tags'))
      .mockResolvedValueOnce([tag])

    const store = useTagsStore()

    await expect(store.fetchAll()).rejects.toThrow('Failed to load tags')
    expect(store.error).toBe('标签加载失败')

    await store.fetchAll()

    expect(getTagsMock).toHaveBeenCalledTimes(2)
    expect(store.items).toEqual([tag])
    expect(store.error).toBeNull()
  })

  it('retries the next non-force fetch after a forced tag refresh fails', async () => {
    const refreshedTag: Tag = {
      ...tag,
      id: 2,
      name: 'pinia',
    }

    getTagsMock
      .mockResolvedValueOnce([tag])
      .mockRejectedValueOnce(new Error('Server unavailable'))
      .mockResolvedValueOnce([refreshedTag])

    const store = useTagsStore()

    await store.fetchAll()
    await expect(store.fetchAll(true)).rejects.toThrow('Server unavailable')
    expect(store.error).toBe('服务暂时不可用，请稍后重试')

    await expect(store.fetchAll()).resolves.toEqual([refreshedTag])

    expect(getTagsMock).toHaveBeenCalledTimes(3)
    expect(store.items).toEqual([refreshedTag])
    expect(store.error).toBeNull()
  })

  it('exposes loading and error state', async () => {
    const successRequest = createDeferred<Tag[]>()
    getTagsMock.mockReturnValueOnce(successRequest.promise)

    const store = useTagsStore()
    const firstFetch = store.fetchAll()

    expect(store.loading).toBe(true)
    expect(store.error).toBeNull()

    successRequest.resolve([tag])
    await firstFetch

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()

    getTagsMock.mockRejectedValueOnce(new Error('Server unavailable'))

    const secondFetch = store.fetchAll(true)

    expect(store.loading).toBe(true)
    expect(store.error).toBeNull()

    await expect(secondFetch).rejects.toThrow('Server unavailable')
    expect(store.loading).toBe(false)
    expect(store.error).toBe('服务暂时不可用，请稍后重试')
  })

  it('ignores stale overlapping refresh responses and keeps loading tied to the newest request', async () => {
    const olderRequest = createDeferred<Tag[]>()
    const newerRequest = createDeferred<Tag[]>()
    const refreshedTag: Tag = {
      ...tag,
      id: 2,
      name: 'react',
    }

    getTagsMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const store = useTagsStore()
    const firstFetch = store.fetchAll()
    const secondFetch = store.fetchAll(true)

    expect(store.loading).toBe(true)

    newerRequest.resolve([refreshedTag])
    await secondFetch

    expect(store.loading).toBe(false)
    expect(store.items).toEqual([refreshedTag])
    expect(store.error).toBeNull()

    olderRequest.resolve([tag])
    await firstFetch

    expect(store.loading).toBe(false)
    expect(store.items).toEqual([refreshedTag])
    expect(store.error).toBeNull()
  })
})
