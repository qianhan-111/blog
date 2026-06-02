import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  deleteAdminArticle,
  getAdminArticleDetail,
  getAdminArticles,
  updateAdminArticle,
} from '@/api/author-articles'
import { HttpClientError } from '@/api/client'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { useAdminArticlesStore } from '@/stores/adminArticles'
import { getAdminToken, setAdminToken } from '@/utils/auth-storage'
import type { ArticleDetail } from '@/types/article'

vi.mock('@/api/author-articles', () => ({
  getMyArticles: vi.fn(),
  getMyArticleDetail: vi.fn(),
  createMyArticle: vi.fn(),
  updateMyArticle: vi.fn(),
  deleteMyArticle: vi.fn(),
  getAdminArticles: vi.fn(),
  getAdminArticleDetail: vi.fn(),
  updateAdminArticle: vi.fn(),
  deleteAdminArticle: vi.fn(),
}))

const getAdminArticlesMock = vi.mocked(getAdminArticles)
const getAdminArticleDetailMock = vi.mocked(getAdminArticleDetail)
const updateAdminArticleMock = vi.mocked(updateAdminArticle)
const deleteAdminArticleMock = vi.mocked(deleteAdminArticle)

const adminArticle: ArticleDetail = {
  id: 301,
  authorId: 9,
  author: {
    id: 9,
    username: 'writer',
    nickname: 'Writer',
    avatarUrl: '/avatar.png',
  },
  title: 'Admin visible article',
  summary: 'Summary',
  coverUrl: '',
  contentMarkdown: 'Body',
  status: 'draft',
  publishTime: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
  categories: [
    {
      id: 1,
      name: 'Vue',
      description: 'Vue articles',
      createdAt: '2026-05-12T00:00:00.000Z',
    },
  ],
  tags: [
    {
      id: 2,
      name: 'Pinia',
      createdAt: '2026-05-12T00:00:00.000Z',
    },
  ],
}

const articlePayload = {
  status: 'draft' as const,
  title: adminArticle.title,
  summary: adminArticle.summary,
  coverUrl: adminArticle.coverUrl,
  categoryIds: [1],
  tagIds: [2],
  contentMarkdown: adminArticle.contentMarkdown,
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

describe('admin articles store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getAdminArticlesMock.mockReset()
    getAdminArticleDetailMock.mockReset()
    updateAdminArticleMock.mockReset()
    deleteAdminArticleMock.mockReset()
  })

  it('fetches the admin article list', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [adminArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const store = useAdminArticlesStore()

    await store.fetchList()

    expect(getAdminArticlesMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    })
    expect(store.items).toEqual([adminArticle])
  })

  it('clears the local admin session when an admin article request confirms session expiration', async () => {
    setAdminToken('admin-token')
    getAdminArticlesMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const adminAuthStore = useAdminAuthStore()
    adminAuthStore.token = 'admin-token'
    adminAuthStore.profile = {
      id: 1,
      username: 'admin',
      nickname: 'Admin',
    }

    const store = useAdminArticlesStore()

    await expect(store.fetchList()).rejects.toThrow('登录已过期，请重新登录')

    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('preserves author, status, and keyword filters while fetching the list', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [adminArticle],
      meta: {
        page: 2,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const store = useAdminArticlesStore()
    store.pagination.page = 2
    store.filters.authorId = 9
    store.filters.status = 'draft'
    store.filters.keyword = 'vue'

    await store.fetchList()

    expect(getAdminArticlesMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      authorId: 9,
      status: 'draft',
      keyword: 'vue',
    })
  })

  it('ignores stale list responses after a newer list request resolves', async () => {
    const olderRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const newerRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const newerArticle = {
      ...adminArticle,
      id: 302,
      title: 'Newer admin list article',
    }

    getAdminArticlesMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const store = useAdminArticlesStore()
    store.filters.keyword = 'older'
    const firstFetch = store.fetchList()

    store.filters.keyword = 'newer'
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
      items: [adminArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 99,
        totalPages: 5,
      },
    })
    await firstFetch

    expect(store.items).toEqual([newerArticle])
    expect(store.pagination).toMatchObject({
      page: 2,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(store.loading).toBe(false)
  })

  it('ignores a list response started with an older admin token', async () => {
    const oldAdminRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const nextAdminArticle = {
      ...adminArticle,
      id: 302,
      title: 'Next admin article',
    }
    setAdminToken('old-admin-token')
    getAdminArticlesMock.mockReturnValueOnce(oldAdminRequest.promise)

    const adminAuthStore = useAdminAuthStore()
    adminAuthStore.token = 'old-admin-token'
    adminAuthStore.profile = {
      id: 1,
      username: 'old-admin',
      nickname: 'Old Admin',
    }

    const store = useAdminArticlesStore()
    const fetchRequest = store.fetchList()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    store.items = [nextAdminArticle]
    store.pagination.page = 3
    store.pagination.total = 1
    store.pagination.totalPages = 1

    oldAdminRequest.resolve({
      items: [adminArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    await fetchRequest

    expect(store.items).toEqual([nextAdminArticle])
    expect(store.pagination).toMatchObject({
      page: 3,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('updates article content without changing author ownership', async () => {
    getAdminArticleDetailMock.mockResolvedValue(adminArticle)
    getAdminArticlesMock.mockResolvedValue({
      items: [
        {
          ...adminArticle,
          title: 'Updated title',
          contentMarkdown: 'Updated body',
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    updateAdminArticleMock.mockResolvedValue({
      ...adminArticle,
      title: 'Updated title',
      contentMarkdown: 'Updated body',
    })

    const store = useAdminArticlesStore()

    await store.fetchDetail(adminArticle.id)
    const updatedArticle = await store.updateArticle(adminArticle.id, {
      status: 'published',
      title: 'Updated title',
      summary: adminArticle.summary,
      coverUrl: adminArticle.coverUrl,
      categoryIds: [1],
      tagIds: [2],
      contentMarkdown: 'Updated body',
    })

    expect(updateAdminArticleMock).toHaveBeenCalledWith(adminArticle.id, {
      status: 'published',
      title: 'Updated title',
      summary: adminArticle.summary,
      coverUrl: adminArticle.coverUrl,
      categoryIds: [1],
      tagIds: [2],
      contentMarkdown: 'Updated body',
    })
    expect(updatedArticle.authorId).toBe(adminArticle.authorId)
    expect(updatedArticle.author).toEqual(adminArticle.author)
    expect(store.currentArticle?.authorId).toBe(adminArticle.authorId)
    expect(getAdminArticlesMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    })
  })

  it('ignores an updated article response started with an older admin token', async () => {
    const oldUpdateRequest = createDeferred<Awaited<ReturnType<typeof updateAdminArticle>>>()
    const nextAdminArticle = {
      ...adminArticle,
      id: 302,
      title: 'Next admin article',
    }
    setAdminToken('old-admin-token')
    updateAdminArticleMock.mockReturnValueOnce(oldUpdateRequest.promise)
    getAdminArticlesMock.mockResolvedValue({
      items: [adminArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const adminAuthStore = useAdminAuthStore()
    adminAuthStore.token = 'old-admin-token'

    const store = useAdminArticlesStore()
    const updateRequest = store.updateArticle(adminArticle.id, articlePayload)

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    store.currentArticle = nextAdminArticle
    store.items = [nextAdminArticle]
    store.pagination.page = 3
    store.pagination.total = 1
    store.pagination.totalPages = 1

    oldUpdateRequest.resolve({
      ...adminArticle,
      title: 'Old updated article',
    })
    await updateRequest

    expect(store.currentArticle).toEqual(nextAdminArticle)
    expect(store.items).toEqual([nextAdminArticle])
    expect(store.pagination).toMatchObject({
      page: 3,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(getAdminArticlesMock).not.toHaveBeenCalled()
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('does not clear a newer admin session after an older update request fails', async () => {
    const oldUpdateRequest = createDeferred<Awaited<ReturnType<typeof updateAdminArticle>>>()
    setAdminToken('old-admin-token')
    updateAdminArticleMock.mockReturnValueOnce(oldUpdateRequest.promise)

    const adminAuthStore = useAdminAuthStore()
    adminAuthStore.token = 'old-admin-token'
    adminAuthStore.profile = {
      id: 1,
      username: 'old-admin',
      nickname: 'Old Admin',
    }

    const store = useAdminArticlesStore()
    const updateRequest = store.updateArticle(adminArticle.id, articlePayload)

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    adminAuthStore.profile = {
      id: 2,
      username: 'new-admin',
      nickname: 'New Admin',
    }

    oldUpdateRequest.reject(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))
    await expect(updateRequest).rejects.toThrow('登录已过期，请重新登录')

    expect(adminAuthStore.token).toBe('new-admin-token')
    expect(adminAuthStore.profile?.username).toBe('new-admin')
    expect(getAdminToken()).toBe('new-admin-token')
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('ignores stale detail responses after a newer detail request resolves', async () => {
    const olderRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticleDetail>>>()
    const newerRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticleDetail>>>()
    const newerArticle = {
      ...adminArticle,
      id: 302,
      title: 'Newer admin article',
    }
    const olderArticle = {
      ...adminArticle,
      id: 301,
      title: 'Stale admin article',
    }

    getAdminArticleDetailMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const store = useAdminArticlesStore()
    const firstFetch = store.fetchDetail(301)
    const secondFetch = store.fetchDetail(302)

    newerRequest.resolve(newerArticle)
    await secondFetch

    olderRequest.resolve(olderArticle)
    await firstFetch

    expect(store.currentArticle).toEqual(newerArticle)
  })

  it('removes updated articles from the current list when they no longer match active filters', async () => {
    getAdminArticlesMock
      .mockResolvedValueOnce({
        items: [adminArticle],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })
      .mockResolvedValueOnce({
        items: [],
        meta: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
        },
      })
    updateAdminArticleMock.mockResolvedValue({
      ...adminArticle,
      status: 'published',
    })

    const store = useAdminArticlesStore()
    store.filters.status = 'draft'

    await store.fetchList()
    await store.updateArticle(adminArticle.id, {
      status: 'published',
      title: adminArticle.title,
      summary: adminArticle.summary,
      coverUrl: adminArticle.coverUrl,
      categoryIds: [1],
      tagIds: [2],
      contentMarkdown: adminArticle.contentMarkdown,
    })

    expect(store.currentArticle?.status).toBe('published')
    expect(store.items).toEqual([])
    expect(store.pagination.total).toBe(0)
    expect(getAdminArticlesMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      status: 'draft',
    })
  })

  it('moves back a page after an updated article leaves the only slot on a later filtered page', async () => {
    getAdminArticlesMock
      .mockResolvedValueOnce({
        items: [adminArticle],
        meta: {
          page: 2,
          pageSize: 20,
          total: 21,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            ...adminArticle,
            id: 300,
            title: 'Previous page draft',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 20,
          totalPages: 1,
        },
      })
    updateAdminArticleMock.mockResolvedValue({
      ...adminArticle,
      status: 'published',
    })

    const store = useAdminArticlesStore()
    store.filters.keyword = 'draft'
    store.filters.status = 'draft'
    store.filters.authorId = 9
    store.pagination.page = 2

    await store.fetchList()
    await store.updateArticle(adminArticle.id, {
      status: 'published',
      title: adminArticle.title,
      summary: adminArticle.summary,
      coverUrl: adminArticle.coverUrl,
      categoryIds: [1],
      tagIds: [2],
      contentMarkdown: adminArticle.contentMarkdown,
    })

    expect(getAdminArticlesMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      keyword: 'draft',
      status: 'draft',
      authorId: 9,
    })
    expect(store.pagination.page).toBe(1)
    expect(store.items).toEqual([
      expect.objectContaining({
        id: 300,
      }),
    ])
  })

  it('moves back a page after deleting the only item on a later page and clears its detail', async () => {
    getAdminArticlesMock
      .mockResolvedValueOnce({
        items: [adminArticle],
        meta: {
          page: 2,
          pageSize: 20,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            ...adminArticle,
            id: 300,
            title: 'Previous page article',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 10,
          totalPages: 1,
        },
      })
    deleteAdminArticleMock.mockResolvedValue(null)

    const store = useAdminArticlesStore()
    store.filters.keyword = 'draft'
    store.filters.status = 'draft'
    store.filters.authorId = 9
    store.pagination.page = 2

    await store.fetchList()
    store.currentArticle = adminArticle

    await store.deleteArticle(adminArticle.id)

    expect(deleteAdminArticleMock).toHaveBeenCalledWith(adminArticle.id)
    expect(getAdminArticlesMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      keyword: 'draft',
      status: 'draft',
      authorId: 9,
    })
    expect(store.currentArticle).toBeNull()
  })

  it('ignores a delete response started with an older admin token', async () => {
    const oldDeleteRequest = createDeferred<Awaited<ReturnType<typeof deleteAdminArticle>>>()
    const nextAdminArticle = {
      ...adminArticle,
      id: 302,
      title: 'Next admin article',
    }
    setAdminToken('old-admin-token')
    deleteAdminArticleMock.mockReturnValueOnce(oldDeleteRequest.promise)
    getAdminArticlesMock.mockResolvedValue({
      items: [adminArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const adminAuthStore = useAdminAuthStore()
    adminAuthStore.token = 'old-admin-token'

    const store = useAdminArticlesStore()
    store.currentArticle = adminArticle
    store.items = [adminArticle]
    store.pagination.page = 2
    store.pagination.total = 21
    store.pagination.totalPages = 2
    const deleteRequest = store.deleteArticle(adminArticle.id)

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    store.currentArticle = nextAdminArticle
    store.items = [nextAdminArticle]
    store.pagination.page = 3
    store.pagination.total = 1
    store.pagination.totalPages = 1

    oldDeleteRequest.resolve(null)
    await deleteRequest

    expect(store.currentArticle).toEqual(nextAdminArticle)
    expect(store.items).toEqual([nextAdminArticle])
    expect(store.pagination).toMatchObject({
      page: 3,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(getAdminArticlesMock).not.toHaveBeenCalled()
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('ignores a stale failed update reload after a newer list request succeeds', async () => {
    const staleUpdateReload = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const newerListRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const updatedArticle = {
      ...adminArticle,
      title: 'Updated admin article',
    }
    const newerArticle = {
      ...adminArticle,
      id: 302,
      title: 'Newer admin list article',
    }

    getAdminArticlesMock
      .mockResolvedValueOnce({
        items: [adminArticle],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })
      .mockReturnValueOnce(staleUpdateReload.promise)
      .mockReturnValueOnce(newerListRequest.promise)
    updateAdminArticleMock.mockResolvedValue(updatedArticle)

    const store = useAdminArticlesStore()
    await store.fetchList()

    const updatePromise = store.updateArticle(adminArticle.id, {
      status: 'draft',
      title: updatedArticle.title,
      summary: adminArticle.summary,
      coverUrl: adminArticle.coverUrl,
      categoryIds: [1],
      tagIds: [2],
      contentMarkdown: adminArticle.contentMarkdown,
    })
    await Promise.resolve()

    store.filters.keyword = 'newer'
    const newerFetch = store.fetchList()
    newerListRequest.resolve({
      items: [newerArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    await newerFetch

    staleUpdateReload.reject(new Error('旧保存刷新失败'))

    await expect(updatePromise).resolves.toEqual(updatedArticle)
    expect(store.items).toEqual([newerArticle])
    expect(store.error).toBeNull()
  })

  it('does not replace a newer selected detail when an older update response resolves', async () => {
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateAdminArticle>>>()
    const reloadRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const newerArticle = {
      ...adminArticle,
      id: 302,
      title: 'Newer selected admin article',
    }

    updateAdminArticleMock.mockReturnValueOnce(updateRequest.promise)
    getAdminArticlesMock.mockReturnValueOnce(reloadRequest.promise)

    const store = useAdminArticlesStore()
    store.currentArticle = adminArticle
    const updatePromise = store.updateArticle(adminArticle.id, articlePayload)
    await Promise.resolve()

    store.currentArticle = newerArticle

    updateRequest.resolve({
      ...adminArticle,
      title: 'Older updated admin article',
    })
    reloadRequest.resolve({
      items: [adminArticle, newerArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      },
    })
    await updatePromise

    expect(store.currentArticle).toEqual(newerArticle)
    expect(store.error).toBeNull()
  })

  it('ignores a stale failed delete reload after a newer list request succeeds', async () => {
    const staleDeleteReload = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const newerListRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const newerArticle = {
      ...adminArticle,
      id: 302,
      title: 'Newer admin list article',
    }

    getAdminArticlesMock
      .mockResolvedValueOnce({
        items: [adminArticle],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })
      .mockReturnValueOnce(staleDeleteReload.promise)
      .mockReturnValueOnce(newerListRequest.promise)
    deleteAdminArticleMock.mockResolvedValue(null)

    const store = useAdminArticlesStore()
    await store.fetchList()

    const deletePromise = store.deleteArticle(adminArticle.id)
    await Promise.resolve()

    store.filters.keyword = 'newer'
    const newerFetch = store.fetchList()
    newerListRequest.resolve({
      items: [newerArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    await newerFetch

    staleDeleteReload.reject(new Error('旧删除刷新失败'))

    await expect(deletePromise).resolves.toBeUndefined()
    expect(store.items).toEqual([newerArticle])
    expect(store.error).toBeNull()
  })
})
