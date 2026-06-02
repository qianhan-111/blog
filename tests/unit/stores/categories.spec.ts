import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { getCategories } from '@/api/categories'
import { useCategoriesStore } from '@/stores/categories'
import type { Category } from '@/types/category'

vi.mock('@/api/categories', () => ({
  getCategories: vi.fn(),
}))

const getCategoriesMock = vi.mocked(getCategories)

const category: Category = {
  id: 1,
  name: 'Frontend',
  description: 'Frontend articles',
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

describe('categories store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getCategoriesMock.mockReset()
  })

  it('fetches once and caches the list', async () => {
    getCategoriesMock.mockResolvedValue([category])

    const store = useCategoriesStore()

    await store.fetchAll()
    await store.fetchAll()

    expect(getCategoriesMock).toHaveBeenCalledTimes(1)
    expect(store.items).toEqual([category])
  })

  it('retries after a failure', async () => {
    getCategoriesMock
      .mockRejectedValueOnce(new Error('Failed to load categories'))
      .mockResolvedValueOnce([category])

    const store = useCategoriesStore()

    await expect(store.fetchAll()).rejects.toThrow('Failed to load categories')
    expect(store.error).toBe('分类加载失败')

    await store.fetchAll()

    expect(getCategoriesMock).toHaveBeenCalledTimes(2)
    expect(store.items).toEqual([category])
    expect(store.error).toBeNull()
  })

  it('retries the next non-force fetch after a forced category refresh fails', async () => {
    const refreshedCategory: Category = {
      ...category,
      id: 2,
      name: 'Backend',
    }

    getCategoriesMock
      .mockResolvedValueOnce([category])
      .mockRejectedValueOnce(new Error('Server unavailable'))
      .mockResolvedValueOnce([refreshedCategory])

    const store = useCategoriesStore()

    await store.fetchAll()
    await expect(store.fetchAll(true)).rejects.toThrow('Server unavailable')
    expect(store.error).toBe('服务暂时不可用，请稍后重试')

    await expect(store.fetchAll()).resolves.toEqual([refreshedCategory])

    expect(getCategoriesMock).toHaveBeenCalledTimes(3)
    expect(store.items).toEqual([refreshedCategory])
    expect(store.error).toBeNull()
  })

  it('exposes loading and error state', async () => {
    const successRequest = createDeferred<Category[]>()
    getCategoriesMock.mockReturnValueOnce(successRequest.promise)

    const store = useCategoriesStore()
    const firstFetch = store.fetchAll()

    expect(store.loading).toBe(true)
    expect(store.error).toBeNull()

    successRequest.resolve([category])
    await firstFetch

    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()

    getCategoriesMock.mockRejectedValueOnce(new Error('Server unavailable'))

    const secondFetch = store.fetchAll(true)

    expect(store.loading).toBe(true)
    expect(store.error).toBeNull()

    await expect(secondFetch).rejects.toThrow('Server unavailable')
    expect(store.loading).toBe(false)
    expect(store.error).toBe('服务暂时不可用，请稍后重试')
  })

  it('ignores stale overlapping refresh responses and keeps loading tied to the newest request', async () => {
    const olderRequest = createDeferred<Category[]>()
    const newerRequest = createDeferred<Category[]>()
    const refreshedCategory: Category = {
      ...category,
      id: 2,
      name: 'Backend',
    }

    getCategoriesMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const store = useCategoriesStore()
    const firstFetch = store.fetchAll()
    const secondFetch = store.fetchAll(true)

    expect(store.loading).toBe(true)

    newerRequest.resolve([refreshedCategory])
    await secondFetch

    expect(store.loading).toBe(false)
    expect(store.items).toEqual([refreshedCategory])
    expect(store.error).toBeNull()

    olderRequest.resolve([category])
    await firstFetch

    expect(store.loading).toBe(false)
    expect(store.items).toEqual([refreshedCategory])
    expect(store.error).toBeNull()
  })
})
