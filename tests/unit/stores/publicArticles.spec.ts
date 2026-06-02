import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { getPublicArticles } from '@/api/public-articles'
import { usePublicArticlesStore } from '@/stores/publicArticles'
import type { PaginatedResponse } from '@/types/api'
import type { ArticleSummary } from '@/types/article'

vi.mock('@/api/public-articles', () => ({
  getPublicArticles: vi.fn(),
}))

const getPublicArticlesMock = vi.mocked(getPublicArticles)

const article: ArticleSummary = {
  id: 1,
  authorId: 42,
  author: {
    id: 42,
    username: 'author',
    nickname: 'Author',
    avatarUrl: '/avatar.png',
  },
  title: 'Public article',
  summary: 'Summary',
  coverUrl: '/cover.png',
  contentMarkdown: 'Body',
  status: 'published',
  publishTime: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
}

function createArticle(overrides: Partial<ArticleSummary>): ArticleSummary {
  return {
    ...article,
    ...overrides,
    author: {
      ...article.author,
      ...overrides.author,
    },
  }
}

function createArticlePage(
  items: ArticleSummary[],
  page: number,
): PaginatedResponse<ArticleSummary> {
  return {
    items,
    meta: {
      page,
      pageSize: 20,
      total: items.length,
      totalPages: 3,
    },
  }
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

describe('public articles store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getPublicArticlesMock.mockReset()
  })

  it('fetches the list with normalized query state', async () => {
    getPublicArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 2,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const store = usePublicArticlesStore()
    store.pagination.page = 2
    store.pagination.pageSize = 999
    store.keyword = '  vue  '
    store.categoryIds = [3]

    await store.fetchList()

    expect(getPublicArticlesMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      keyword: 'vue',
      categoryIds: [3],
    })
    expect(store.items).toEqual([article])
    expect(store.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
  })

  it('clears filters and resets page to 1', () => {
    const store = usePublicArticlesStore()
    store.pagination.page = 4
    store.pagination.pageSize = 50
    store.keyword = 'react'
    store.categoryIds = [1]
    store.tagIds = [2]
    store.sortField = 'updateTime'
    store.sortOrder = 'asc'

    store.clearFilters()

    expect(store.pagination.page).toBe(1)
    expect(store.keyword).toBe('')
    expect(store.categoryIds).toEqual([])
    expect(store.tagIds).toEqual([])
    expect(store.sortField).toBeUndefined()
    expect(store.sortOrder).toBeUndefined()
    expect(store.pagination.pageSize).toBe(50)
  })

  it('replaces page 1 results and appends unique next-page results in append mode', async () => {
    const staleArticle = createArticle({ id: 99, title: 'Stale article' })
    const duplicateArticle = createArticle({ id: 1, title: 'Duplicate should not replace' })
    const nextArticle = createArticle({ id: 2, title: 'Next article' })

    getPublicArticlesMock
      .mockResolvedValueOnce(createArticlePage([staleArticle], 9))
      .mockResolvedValueOnce(createArticlePage([article], 1))
      .mockResolvedValueOnce(createArticlePage([duplicateArticle, nextArticle], 2))

    const store = usePublicArticlesStore()
    store.pagination.page = 9
    await store.fetchList()
    expect(store.items).toEqual([staleArticle])

    store.pagination.page = 1
    await store.fetchList()
    expect(store.items).toEqual([article])

    store.pagination.page = 2
    await store.fetchList({ append: true })

    expect(store.items).toEqual([article, nextArticle])
    expect(store.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 2,
      totalPages: 3,
    })
  })

  it('keeps loading and error state tied to the newest overlapping request', async () => {
    const olderRequest = createDeferred<PaginatedResponse<ArticleSummary>>()
    const newerRequest = createDeferred<PaginatedResponse<ArticleSummary>>()
    const newerArticle = createArticle({ id: 2, title: 'Newer article' })

    getPublicArticlesMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const store = usePublicArticlesStore()
    const firstFetch = store.fetchList({ append: true })

    store.pagination.page = 2
    const secondFetch = store.fetchList()

    newerRequest.resolve(createArticlePage([newerArticle], 2))
    await secondFetch

    olderRequest.reject(new Error('older request failed'))
    await expect(firstFetch).rejects.toThrow('older request failed')

    expect(store.items).toEqual([newerArticle])
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('uses a Chinese fallback when list loading fails without an Error object', async () => {
    getPublicArticlesMock.mockRejectedValueOnce('boom')

    const store = usePublicArticlesStore()

    await expect(store.fetchList()).rejects.toBe('boom')
    expect(store.error).toBe('文章加载失败')
  })

  it('updates state from the route query', () => {
    const store = usePublicArticlesStore()

    store.syncFromRoute({
      page: '3',
      pageSize: '50',
      keyword: 'pinia',
      categoryIds: '4,5',
      tagIds: '8',
      sortField: 'publishTime',
      sortOrder: 'desc',
    })

    expect(store.pagination.page).toBe(3)
    expect(store.pagination.pageSize).toBe(50)
    expect(store.keyword).toBe('pinia')
    expect(store.categoryIds).toEqual([4, 5])
    expect(store.tagIds).toEqual([8])
    expect(store.sortField).toBe('publishTime')
    expect(store.sortOrder).toBe('desc')
  })

  it('ignores stale overlapping fetch results that resolve after a newer request', async () => {
    const olderRequest = createDeferred<{
      items: ArticleSummary[]
      meta: { page: number; pageSize: number; total: number; totalPages: number }
    }>()
    const newerRequest = createDeferred<{
      items: ArticleSummary[]
      meta: { page: number; pageSize: number; total: number; totalPages: number }
    }>()
    const newerArticle: ArticleSummary = {
      ...article,
      id: 2,
      title: 'Newer article',
    }

    getPublicArticlesMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const store = usePublicArticlesStore()
    store.keyword = 'older'
    const firstFetch = store.fetchList()

    store.keyword = 'newer'
    store.pagination.page = 2
    const secondFetch = store.fetchList()

    newerRequest.resolve({
      items: [newerArticle],
      meta: {
        page: 2,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    await secondFetch

    olderRequest.resolve({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 99,
        totalPages: 5,
      },
    })
    await firstFetch

    expect(store.items).toEqual([newerArticle])
    expect(store.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(store.loading).toBe(false)
  })
})
