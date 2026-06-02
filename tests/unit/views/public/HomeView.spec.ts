import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import { HttpClientError } from '@/api/client'
import { getCategories } from '@/api/categories'
import { getPublicArticles } from '@/api/public-articles'
import { getTags } from '@/api/tags'
import { RECENT_PUBLIC_ARTICLES_STORAGE_KEY } from '@/constants/public'
import { ROUTE_NAMES } from '@/constants/routes'
import { createAppRouter } from '@/router'
import type { ArticleSummary } from '@/types/article'
import HomeView from '@/views/public/HomeView.vue'

vi.mock('@/api/public-articles', () => ({
  getPublicArticles: vi.fn(),
}))

vi.mock('@/api/categories', () => ({
  getCategories: vi.fn(),
}))

vi.mock('@/api/tags', () => ({
  getTags: vi.fn(),
}))

const getPublicArticlesMock = vi.mocked(getPublicArticles)
const getCategoriesMock = vi.mocked(getCategories)
const getTagsMock = vi.mocked(getTags)

function createArticle(overrides: Partial<ArticleSummary> = {}): ArticleSummary {
  return {
    id: 11,
    authorId: 7,
    author: {
      id: 7,
      username: 'writer',
      nickname: 'Writer',
      avatarUrl: '/avatar.png',
    },
    title: 'Intro to Vue',
    summary: 'Summary',
    coverUrl: '/cover.png',
    contentMarkdown: 'Body',
    status: 'published',
    publishTime: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T00:00:00.000Z',
    ...overrides,
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

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    getPublicArticlesMock.mockReset()
    getCategoriesMock.mockReset()
    getTagsMock.mockReset()

    getCategoriesMock.mockResolvedValue([
      {
        id: 1,
        name: 'Vue',
        description: 'Vue articles',
        createdAt: '2026-05-12T00:00:00.000Z',
      },
    ])
    getTagsMock.mockResolvedValue([
      {
        id: 8,
        name: 'Pinia',
        createdAt: '2026-05-12T00:00:00.000Z',
      },
    ])
    getPublicArticlesMock.mockResolvedValue({
      items: [
        {
          id: 11,
          authorId: 7,
          author: {
            id: 7,
            username: 'writer',
            nickname: 'Writer',
            avatarUrl: '/avatar.png',
          },
          title: 'Intro to Vue',
          summary: 'Summary',
          coverUrl: '/cover.png',
          contentMarkdown: 'Body',
          status: 'published',
          publishTime: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      meta: {
        page: 3,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
  })

  it('keeps the left rail focused on navigation and renders filters plus recent browsing in the right rail', async () => {
    localStorage.setItem(
      RECENT_PUBLIC_ARTICLES_STORAGE_KEY,
      JSON.stringify([
        {
          id: 41,
          title: '最近看过的文章',
          authorId: 7,
          authorName: 'Writer',
          coverUrl: '/recent-cover.png',
          viewedAt: '2026-05-15T10:00:00.000Z',
        },
      ]),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.get('[data-test="public-left-rail"]').text()).not.toContain('按更新')
    expect(wrapper.get('[data-test="public-left-rail"]').text()).not.toContain('升序')
    expect(wrapper.get('[data-test="public-right-rail"]').text()).toContain('高级筛选')
    expect(wrapper.get('[data-test="public-right-rail"]').text()).toContain('最近浏览')
    expect(wrapper.get('[data-test="public-right-rail"]').text()).toContain('最近看过的文章')
  })

  it('keeps only truly matching home shortcuts marked as current', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    const leftRailCurrent = wrapper
      .get('[data-test="public-left-rail"]')
      .findAll('[aria-current="page"]')
      .map((link) => link.text())
    const rightRailCurrent = wrapper
      .findAll('#tags [aria-current="page"], #categories [aria-current="page"]')
      .map((link) => link.text())

    expect(leftRailCurrent).toEqual(['首页'])
    expect(rightRailCurrent).toEqual([])
  })

  it('marks the matching taxonomy shortcut as current only when that filter is active', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/?categoryIds=1&page=1')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    const currentCategoryLinks = wrapper.findAll('#categories [aria-current="page"]').map((link) => link.text())

    expect(currentCategoryLinks).toEqual(['Vue'])
  })

  it('hydrates filters from the route query and fetches the article list', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push({
      path: '/articles',
      query: {
        page: '3',
        pageSize: '20',
        keyword: 'vue',
        categoryIds: '1',
        tagIds: '8',
        sortField: 'publishTime',
        sortOrder: 'desc',
      },
    })
    await router.isReady()

    mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(getPublicArticlesMock).toHaveBeenCalledWith({
      page: 3,
      pageSize: 20,
      keyword: 'vue',
      categoryIds: [1],
      tagIds: [8],
      sortField: 'publishTime',
      sortOrder: 'desc',
    })
    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.home)
  })

  it('preserves the complete route query filter contract', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push({
      path: '/',
      query: {
        page: '2',
        pageSize: '50',
        keyword: '  feed redesign  ',
        categoryIds: ['1', '2'],
        tagIds: '8,9',
        sortField: 'updateTime',
        sortOrder: 'asc',
      },
    })
    await router.isReady()

    mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(getPublicArticlesMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 50,
      keyword: 'feed redesign',
      categoryIds: [1, 2],
      tagIds: [8, 9],
      sortField: 'updateTime',
      sortOrder: 'asc',
    })
  })

  it('clears filters back to the base query state', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push({
      path: '/',
      query: {
        page: '4',
        pageSize: '20',
        keyword: 'vue',
        categoryIds: '1',
      },
    })
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    await wrapper.get('[data-test="clear-filters"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('syncs filter changes into the route query immediately and resets page to 1', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push({
      path: '/',
      query: {
        page: '4',
        pageSize: '20',
        keyword: 'old',
      },
    })
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    await wrapper.get('[data-test="keyword-input"]').setValue('new search')
    await flushPromises()

    expect(router.currentRoute.value.query.page).toBe('1')
    expect(router.currentRoute.value.query.keyword).toBe('new search')
    expect(getPublicArticlesMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      keyword: 'new search',
    })
  })

  it('returns to the base route when the final advanced filter is cleared from a later page', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push({
      path: '/',
      query: {
        page: '4',
        pageSize: '20',
        keyword: 'vue',
      },
    })
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    await wrapper.get('[data-test="keyword-input"]').setValue('')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(router.currentRoute.value.query).toEqual({})
    expect(getPublicArticlesMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
    })
  })

  it('keeps the current feed visible when a later filter refresh fails', async () => {
    getPublicArticlesMock
      .mockResolvedValueOnce({
        items: [createArticle()],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'network',
          message: '网络连接失败，请检查网络或后端服务',
          retryable: true,
          shouldReport: true,
        }),
      )

    const router = createAppRouter(createMemoryHistory())

    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    await wrapper.get('[data-test="keyword-input"]').setValue('broken refresh')
    await flushPromises()

    expect(wrapper.text()).toContain('Intro to Vue')
    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
  })

  it('loads the next feed page in append mode without dropping active filters', async () => {
    getPublicArticlesMock
      .mockResolvedValueOnce({
        items: [createArticle()],
        meta: {
          page: 1,
          pageSize: 20,
          total: 3,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [
          createArticle({ title: 'Duplicate should stay hidden' }),
          createArticle({ id: 12, title: 'Next Article' }),
        ],
        meta: {
          page: 2,
          pageSize: 20,
          total: 3,
          totalPages: 2,
        },
      })

    const router = createAppRouter(createMemoryHistory())

    await router.push({
      path: '/',
      query: {
        page: '1',
        keyword: 'vue',
        categoryIds: '1',
        sortField: 'publishTime',
        sortOrder: 'desc',
      },
    })
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    await wrapper.get('[data-test="load-next-page"]').trigger('click')
    await flushPromises()

    expect(getPublicArticlesMock).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
      keyword: 'vue',
      categoryIds: [1],
      sortField: 'publishTime',
      sortOrder: 'desc',
    })
    expect(router.currentRoute.value.query.keyword).toBe('vue')
    expect(wrapper.text()).toContain('Intro to Vue')
    expect(wrapper.text()).toContain('Next Article')
    expect(wrapper.text()).not.toContain('Duplicate should stay hidden')
  })

  it('does not let a stale failed load-more request roll back newer filter results', async () => {
    const loadMoreRequest = createDeferred<Awaited<ReturnType<typeof getPublicArticles>>>()

    getPublicArticlesMock
      .mockResolvedValueOnce({
        items: [createArticle({ title: 'Second page article' })],
        meta: {
          page: 2,
          pageSize: 20,
          total: 41,
          totalPages: 3,
        },
      })
      .mockReturnValueOnce(loadMoreRequest.promise)
      .mockResolvedValueOnce({
        items: [createArticle({ id: 31, title: 'Filtered article' })],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })

    const router = createAppRouter(createMemoryHistory())

    await router.push({
      path: '/',
      query: {
        page: '2',
        pageSize: '20',
      },
    })
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    wrapper.get('[data-test="load-next-page"]').element.click()
    await flushPromises()

    await wrapper.get('[data-test="keyword-input"]').setValue('filtered')
    await flushPromises()

    loadMoreRequest.reject(new Error('加载更多失败'))
    await flushPromises()

    expect(wrapper.text()).toContain('Filtered article')
    expect(wrapper.text()).toContain('1 篇 · 1/1')
    expect(wrapper.text()).not.toContain('1 篇 · 2/1')
  })

  it('clears stale load-more loading state after newer filter results render', async () => {
    const loadMoreRequest = createDeferred<Awaited<ReturnType<typeof getPublicArticles>>>()

    getPublicArticlesMock
      .mockResolvedValueOnce({
        items: [createArticle()],
        meta: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 2,
        },
      })
      .mockReturnValueOnce(loadMoreRequest.promise)
      .mockResolvedValueOnce({
        items: [createArticle({ id: 31, title: 'Filtered article' })],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })

    const router = createAppRouter(createMemoryHistory())

    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    wrapper.get('[data-test="load-next-page"]').element.click()
    await flushPromises()

    try {
      await wrapper.get('[data-test="keyword-input"]').setValue('filtered')
      await flushPromises()

      expect(wrapper.text()).toContain('Filtered article')
      expect(wrapper.find('[data-test="load-next-page"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('加载中')
    } finally {
      loadMoreRequest.reject(new Error('加载更多失败'))
      await flushPromises()
    }
  })
})
