import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  createMyArticle,
  deleteMyArticle,
  getMyArticleDetail,
  getMyArticles,
  updateMyArticle,
} from '@/api/author-articles'
import { HttpClientError } from '@/api/client'
import { useAuthorArticlesStore } from '@/stores/authorArticles'
import { useUserAuthStore } from '@/stores/userAuth'
import { getUserToken, setUserToken } from '@/utils/auth-storage'

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

const getMyArticlesMock = vi.mocked(getMyArticles)
const getMyArticleDetailMock = vi.mocked(getMyArticleDetail)
const createMyArticleMock = vi.mocked(createMyArticle)
const updateMyArticleMock = vi.mocked(updateMyArticle)
const deleteMyArticleMock = vi.mocked(deleteMyArticle)

const article = {
  id: 101,
  authorId: 9,
  author: {
    id: 9,
    username: 'writer',
    nickname: 'Writer',
    avatarUrl: '/avatar.png',
  },
  title: 'Draft article',
  summary: 'Summary',
  coverUrl: '',
  contentMarkdown: 'Body',
  status: 'draft' as const,
  publishTime: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
}

const articleDetail = {
  ...article,
  categories: [],
  tags: [],
}

const articlePayload = {
  status: 'draft' as const,
  title: 'Draft article',
  summary: 'Summary',
  coverUrl: '',
  categoryIds: [1],
  tagIds: [],
  contentMarkdown: 'Body',
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

describe('author articles store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getMyArticlesMock.mockReset()
    getMyArticleDetailMock.mockReset()
    createMyArticleMock.mockReset()
    updateMyArticleMock.mockReset()
    deleteMyArticleMock.mockReset()
  })

  it('fetches the current author article list', async () => {
    getMyArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 2,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const store = useAuthorArticlesStore()
    store.filters.keyword = 'draft'
    store.pagination.page = 2

    await store.fetchList()

    expect(getMyArticlesMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      keyword: 'draft',
    })
    expect(store.items).toEqual([article])
  })

  it('clears the local user session when an author article request confirms session expiration', async () => {
    setUserToken('user-token')
    getMyArticlesMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'user-token'
    userAuthStore.profile = {
      id: 9,
      username: 'writer',
      email: 'writer@example.com',
      nickname: 'Writer',
      avatarUrl: '',
      bio: '',
      role: 'author',
      status: 'enabled',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    }

    const store = useAuthorArticlesStore()

    await expect(store.fetchList()).rejects.toThrow('登录已过期，请重新登录')

    expect(userAuthStore.token).toBeNull()
    expect(userAuthStore.profile).toBeNull()
    expect(getUserToken()).toBeNull()
  })

  it('preserves keyword and status filters while refreshing the list', async () => {
    getMyArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const store = useAuthorArticlesStore()
    store.filters.keyword = 'vue'
    store.filters.status = 'draft'

    await store.fetchList()

    expect(getMyArticlesMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      keyword: 'vue',
      status: 'draft',
    })
  })

  it('ignores stale list responses after a newer list request resolves', async () => {
    const olderRequest = createDeferred<Awaited<ReturnType<typeof getMyArticles>>>()
    const newerRequest = createDeferred<Awaited<ReturnType<typeof getMyArticles>>>()
    const newerArticle = {
      ...article,
      id: 102,
      title: 'Newer list draft',
    }

    getMyArticlesMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const store = useAuthorArticlesStore()
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
    expect(store.pagination).toMatchObject({
      page: 2,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(store.loading).toBe(false)
  })

  it('ignores a list response started with an older user token', async () => {
    const oldUserRequest = createDeferred<Awaited<ReturnType<typeof getMyArticles>>>()
    const nextUserArticle = {
      ...article,
      id: 102,
      title: 'Next user draft',
    }
    setUserToken('old-user-token')
    getMyArticlesMock.mockReturnValueOnce(oldUserRequest.promise)

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'old-user-token'
    userAuthStore.profile = {
      id: 9,
      username: 'old-writer',
      email: 'old-writer@example.com',
      nickname: 'Old Writer',
      avatarUrl: '',
      bio: '',
      role: 'author',
      status: 'enabled',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    }

    const store = useAuthorArticlesStore()
    const fetchRequest = store.fetchList()

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    store.items = [nextUserArticle]
    store.pagination.page = 3
    store.pagination.total = 1
    store.pagination.totalPages = 1

    oldUserRequest.resolve({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    await fetchRequest

    expect(store.items).toEqual([nextUserArticle])
    expect(store.pagination).toMatchObject({
      page: 3,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('ignores a created article response started with an older user token', async () => {
    const oldCreateRequest = createDeferred<Awaited<ReturnType<typeof createMyArticle>>>()
    const nextUserArticle = {
      ...articleDetail,
      id: 202,
      title: 'Next user article',
    }
    setUserToken('old-user-token')
    createMyArticleMock.mockReturnValueOnce(oldCreateRequest.promise)

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'old-user-token'

    const store = useAuthorArticlesStore()
    const createRequest = store.createArticle(articlePayload)

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    store.currentArticle = nextUserArticle

    oldCreateRequest.resolve(articleDetail)
    await createRequest

    expect(store.currentArticle).toEqual(nextUserArticle)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('does not overwrite a newer current article with a stale create response', async () => {
    const createRequest = createDeferred<Awaited<ReturnType<typeof createMyArticle>>>()
    const newerArticle = {
      ...articleDetail,
      id: 202,
      title: 'Newer current article',
    }
    setUserToken('user-token')
    createMyArticleMock.mockReturnValueOnce(createRequest.promise)

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'user-token'

    const store = useAuthorArticlesStore()
    const create = store.createArticle(articlePayload)

    store.currentArticle = newerArticle

    createRequest.resolve({
      ...articleDetail,
      id: 303,
      title: 'Stale created article',
    })
    await create

    expect(store.currentArticle).toEqual(newerArticle)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('does not clear a newer user session after an older update request fails', async () => {
    const oldUpdateRequest = createDeferred<Awaited<ReturnType<typeof updateMyArticle>>>()
    setUserToken('old-user-token')
    updateMyArticleMock.mockReturnValueOnce(oldUpdateRequest.promise)

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'old-user-token'
    userAuthStore.profile = {
      id: 9,
      username: 'old-writer',
      email: 'old-writer@example.com',
      nickname: 'Old Writer',
      avatarUrl: '',
      bio: '',
      role: 'author',
      status: 'enabled',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    }

    const store = useAuthorArticlesStore()
    const updateRequest = store.updateArticle(article.id, articlePayload)

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    userAuthStore.profile = {
      id: 10,
      username: 'new-writer',
      email: 'new-writer@example.com',
      nickname: 'New Writer',
      avatarUrl: '',
      bio: '',
      role: 'author',
      status: 'enabled',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
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

    expect(userAuthStore.token).toBe('new-user-token')
    expect(userAuthStore.profile?.username).toBe('new-writer')
    expect(getUserToken()).toBe('new-user-token')
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('does not overwrite a newer current article with a stale update response', async () => {
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateMyArticle>>>()
    const newerArticle = {
      ...articleDetail,
      id: 202,
      title: 'Newer current article',
    }
    setUserToken('user-token')
    updateMyArticleMock.mockReturnValueOnce(updateRequest.promise)

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'user-token'

    const store = useAuthorArticlesStore()
    store.currentArticle = {
      ...articleDetail,
      id: 101,
      title: 'Article being saved',
    }
    const update = store.updateArticle(101, articlePayload)

    store.currentArticle = newerArticle

    updateRequest.resolve({
      ...articleDetail,
      id: 101,
      title: 'Stale saved article',
    })
    await update

    expect(store.currentArticle).toEqual(newerArticle)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('ignores stale detail responses after a newer detail request resolves', async () => {
    const olderRequest = createDeferred<Awaited<ReturnType<typeof getMyArticleDetail>>>()
    const newerRequest = createDeferred<Awaited<ReturnType<typeof getMyArticleDetail>>>()
    const newerArticle = {
      ...article,
      id: 102,
      title: 'Newer draft',
      categories: [],
      tags: [],
    }
    const olderArticle = {
      ...article,
      id: 101,
      title: 'Stale draft',
      categories: [],
      tags: [],
    }

    getMyArticleDetailMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const store = useAuthorArticlesStore()
    const firstFetch = store.fetchDetail(101)
    const secondFetch = store.fetchDetail(102)

    newerRequest.resolve(newerArticle)
    await secondFetch

    olderRequest.resolve(olderArticle)
    await firstFetch

    expect(store.currentArticle).toEqual(newerArticle)
  })

  it('moves back a page after deleting the only item on a later page and clears its detail', async () => {
    getMyArticlesMock
      .mockResolvedValueOnce({
        items: [article],
        meta: {
          page: 3,
          pageSize: 20,
          total: 21,
          totalPages: 3,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            ...article,
            id: 100,
            title: 'Previous page article',
          },
        ],
        meta: {
          page: 2,
          pageSize: 20,
          total: 20,
          totalPages: 2,
        },
      })
    deleteMyArticleMock.mockResolvedValue(null)

    const store = useAuthorArticlesStore()
    store.filters.keyword = 'draft'
    store.filters.status = 'draft'
    store.pagination.page = 3

    await store.fetchList()
    store.currentArticle = {
      ...article,
      categories: [],
      tags: [],
    }
    await store.deleteArticle(article.id)

    expect(deleteMyArticleMock).toHaveBeenCalledWith(article.id)
    expect(getMyArticlesMock).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
      keyword: 'draft',
      status: 'draft',
    })
    expect(store.filters.keyword).toBe('draft')
    expect(store.filters.status).toBe('draft')
    expect(store.pagination.page).toBe(2)
    expect(store.currentArticle).toBeNull()
  })

  it('ignores a delete response started with an older user token', async () => {
    const oldDeleteRequest = createDeferred<Awaited<ReturnType<typeof deleteMyArticle>>>()
    const nextUserArticle = {
      ...articleDetail,
      id: 202,
      title: 'Next user article',
    }
    setUserToken('old-user-token')
    deleteMyArticleMock.mockReturnValueOnce(oldDeleteRequest.promise)
    getMyArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'old-user-token'

    const store = useAuthorArticlesStore()
    store.currentArticle = articleDetail
    store.items = [article]
    store.pagination.page = 2
    store.pagination.total = 21
    store.pagination.totalPages = 2
    const deleteRequest = store.deleteArticle(article.id)

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    store.currentArticle = nextUserArticle
    store.items = [nextUserArticle]
    store.pagination.page = 3
    store.pagination.total = 1
    store.pagination.totalPages = 1

    oldDeleteRequest.resolve(null)
    await deleteRequest

    expect(store.currentArticle).toEqual(nextUserArticle)
    expect(store.items).toEqual([nextUserArticle])
    expect(store.pagination).toMatchObject({
      page: 3,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(getMyArticlesMock).not.toHaveBeenCalled()
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('ignores a stale failed delete reload after a newer list request succeeds', async () => {
    const staleDeleteReload = createDeferred<Awaited<ReturnType<typeof getMyArticles>>>()
    const newerListRequest = createDeferred<Awaited<ReturnType<typeof getMyArticles>>>()
    const newerArticle = {
      ...article,
      id: 102,
      title: 'Newer author list article',
    }

    getMyArticlesMock
      .mockResolvedValueOnce({
        items: [article],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })
      .mockReturnValueOnce(staleDeleteReload.promise)
      .mockReturnValueOnce(newerListRequest.promise)
    deleteMyArticleMock.mockResolvedValue(null)

    const store = useAuthorArticlesStore()
    await store.fetchList()

    const deletePromise = store.deleteArticle(article.id)
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
