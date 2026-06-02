import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import { HttpClientError } from '@/api/client'
import {
  getArticleDetail,
  getArticlePrevNext,
  getAuthorArticles,
  getAuthorProfile,
} from '@/api/public-articles'
import { RECENT_PUBLIC_ARTICLES_STORAGE_KEY } from '@/constants/public'
import { createAppRouter } from '@/router'
import { useRecentPublicArticlesStore } from '@/stores/recentPublicArticles'
import ArticleDetailView from '@/views/public/ArticleDetailView.vue'
import AuthorProfileView from '@/views/public/AuthorProfileView.vue'

vi.mock('@/api/public-articles', () => ({
  getPublicArticles: vi.fn(),
  getArticleDetail: vi.fn(),
  getArticlePrevNext: vi.fn(),
  getAuthorProfile: vi.fn(),
  getAuthorArticles: vi.fn(),
}))

const getArticleDetailMock = vi.mocked(getArticleDetail)
const getArticlePrevNextMock = vi.mocked(getArticlePrevNext)
const getAuthorProfileMock = vi.mocked(getAuthorProfile)
const getAuthorArticlesMock = vi.mocked(getAuthorArticles)

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

describe('public article detail and author profile views', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    getArticleDetailMock.mockReset()
    getArticlePrevNextMock.mockReset()
    getAuthorProfileMock.mockReset()
    getAuthorArticlesMock.mockReset()
  })

  it('loads article detail with metadata and prev/next navigation', async () => {
    getArticleDetailMock.mockResolvedValue({
      id: 21,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Advanced Vue',
      summary: 'Deep dive',
      coverUrl: '/cover.png',
      contentMarkdown: '# Title\n\n## Section\n\n```ts\nconst x = 1\n```',
      status: 'published',
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
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
          id: 8,
          name: 'Pinia',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      ],
    })
    getArticlePrevNextMock.mockResolvedValue({
      prev: { id: 20, title: 'Previous' },
      next: { id: 22, title: 'Next' },
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/articles/21')
    await router.isReady()

    const wrapper = mount(ArticleDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(router.currentRoute.value.params.id).toBe('21')
    expect(getArticleDetailMock).toHaveBeenCalledWith(21)
    expect(getArticlePrevNextMock).toHaveBeenCalledWith(21)
    expect(wrapper.text()).toContain('Advanced Vue')
    expect(wrapper.text()).toContain('Previous')
    expect(wrapper.text()).toContain('Next')
  })

  it('rejects malformed article ids without requesting a partial numeric match', async () => {
    getArticleDetailMock.mockResolvedValue({
      id: 21,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Advanced Vue',
      summary: 'Deep dive',
      coverUrl: '/cover.png',
      contentMarkdown: '# Title',
      status: 'published',
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: [],
      tags: [],
    })
    getArticlePrevNextMock.mockResolvedValue({
      prev: null,
      next: null,
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/articles/21abc')
    await router.isReady()

    const wrapper = mount(ArticleDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('无效的文章编号')
    expect(getArticleDetailMock).not.toHaveBeenCalled()
    expect(getArticlePrevNextMock).not.toHaveBeenCalled()
  })

  it('clears a stale article id error when navigating to a valid article', async () => {
    const articleRequest = createDeferred<Awaited<ReturnType<typeof getArticleDetail>>>()

    getArticleDetailMock.mockReturnValue(articleRequest.promise)
    getArticlePrevNextMock.mockResolvedValue({
      prev: null,
      next: null,
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/articles/not-a-number')
    await router.isReady()

    const wrapper = mount(ArticleDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('无效的文章编号')

    await router.push('/articles/21')
    await flushPromises()

    expect(getArticleDetailMock).toHaveBeenCalledWith(21)
    expect(wrapper.text()).toContain('加载文章')
    expect(wrapper.text()).not.toContain('无效的文章编号')

    articleRequest.resolve({
      id: 21,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Recovered Article',
      summary: 'Deep dive',
      coverUrl: '/cover.png',
      contentMarkdown: '# Title',
      status: 'published',
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: [],
      tags: [],
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Recovered Article')
  })

  it('shows timeout recovery guidance when the article detail request fails', async () => {
    getArticleDetailMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )
    getArticlePrevNextMock.mockResolvedValue({
      prev: null,
      next: null,
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/articles/21')
    await router.isReady()

    const wrapper = mount(ArticleDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')
    expect(wrapper.text()).toContain('重新加载')
  })

  it('does not request author articles when the author profile fails', async () => {
    getAuthorProfileMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )
    getAuthorArticlesMock.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/authors/7')
    await router.isReady()

    const wrapper = mount(AuthorProfileView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(getAuthorProfileMock).toHaveBeenCalledWith(7)
    expect(getAuthorArticlesMock).not.toHaveBeenCalled()
  })

  it('keeps the article visible when prev-next navigation fails', async () => {
    getArticleDetailMock.mockResolvedValue({
      id: 21,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Readable Article',
      summary: 'Deep dive',
      coverUrl: '/cover.png',
      contentMarkdown: '# Title',
      status: 'published',
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: [],
      tags: [],
    })
    getArticlePrevNextMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/articles/21')
    await router.isReady()

    const wrapper = mount(ArticleDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Readable Article')
    expect(wrapper.text()).toContain('已经是第一篇')
    expect(wrapper.text()).not.toContain('文章不可用')
  })

  it('shows the article before slow prev-next navigation finishes', async () => {
    const slowPrevNextRequest = createDeferred<Awaited<ReturnType<typeof getArticlePrevNext>>>()

    getArticleDetailMock.mockResolvedValue({
      id: 21,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Fast Article',
      summary: 'Deep dive',
      coverUrl: '/cover.png',
      contentMarkdown: '# Title',
      status: 'published',
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: [],
      tags: [],
    })
    getArticlePrevNextMock.mockReturnValue(slowPrevNextRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/articles/21')
    await router.isReady()

    const wrapper = mount(ArticleDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Fast Article')
    expect(wrapper.text()).not.toContain('加载文章')

    slowPrevNextRequest.resolve({
      prev: { id: 20, title: 'Previous article' },
      next: null,
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Previous article')
  })

  it('keeps the article error state visible while retrying and clears it after a successful retry', async () => {
    let resolveRetry: ((value: typeof articleDetail) => void) | null = null
    const articleDetail = {
      id: 21,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Advanced Vue',
      summary: 'Deep dive',
      coverUrl: '/cover.png',
      contentMarkdown: '# Title',
      status: 'published' as const,
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: [],
      tags: [],
    }

    getArticleDetailMock
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'network',
          message: '网络连接失败，请检查网络或后端服务',
          retryable: true,
          shouldReport: true,
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve
          }),
      )
    getArticlePrevNextMock
      .mockResolvedValueOnce({
        prev: null,
        next: null,
      })
      .mockResolvedValueOnce({
        prev: null,
        next: null,
      })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/articles/21')
    await router.isReady()

    const wrapper = mount(ArticleDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    const retryButton = wrapper.get('.error-state__action')
    await retryButton.trigger('click')

    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(retryButton.text()).toBe('正在重试')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')

    resolveRetry?.(articleDetail)
    await flushPromises()

    expect(wrapper.text()).toContain('Advanced Vue')
    expect(wrapper.text()).not.toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).not.toContain('请检查网络或服务状态后重试')
  })

  it('tracks the opened article and shows recent browsing in the author side rail', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    localStorage.setItem(
      RECENT_PUBLIC_ARTICLES_STORAGE_KEY,
      JSON.stringify([
        {
          id: 21,
          title: 'Advanced Vue',
          authorId: 7,
          authorName: 'Writer',
          coverUrl: '/cover.png',
          viewedAt: '2026-05-15T10:00:00.000Z',
        },
      ]),
    )

    getArticleDetailMock.mockResolvedValue({
      id: 21,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Advanced Vue',
      summary: 'Deep dive',
      coverUrl: '/cover.png',
      contentMarkdown: '# Title',
      status: 'published',
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: [],
      tags: [],
    })
    getArticlePrevNextMock.mockResolvedValue({
      prev: null,
      next: null,
    })
    getAuthorProfileMock.mockResolvedValue({
      id: 7,
      username: 'writer',
      nickname: 'Writer',
      avatarUrl: '/avatar.png',
      bio: 'Writes about Vue.',
    })
    getAuthorArticlesMock.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    })

    const articleRouter = createAppRouter(createMemoryHistory())
    await articleRouter.push('/articles/21')
    await articleRouter.isReady()

    mount(ArticleDetailView, {
      global: {
        plugins: [pinia, articleRouter],
      },
    })

    await flushPromises()

    const recentStore = useRecentPublicArticlesStore()
    expect(recentStore.items[0]).toMatchObject({
      id: 21,
      title: 'Advanced Vue',
    })

    const authorRouter = createAppRouter(createMemoryHistory())
    await authorRouter.push('/authors/7')
    await authorRouter.isReady()

    const authorWrapper = mount(AuthorProfileView, {
      global: {
        plugins: [pinia, authorRouter],
      },
    })

    await flushPromises()

    expect(authorWrapper.get('[data-test="author-right-rail"]').text()).toContain('最近浏览')
    expect(authorWrapper.get('[data-test="author-right-rail"]').text()).toContain('Advanced Vue')
  })

  it('ignores stale article detail responses after navigating to another article', async () => {
    const olderArticleRequest = createDeferred<Awaited<ReturnType<typeof getArticleDetail>>>()
    const newerArticleRequest = createDeferred<Awaited<ReturnType<typeof getArticleDetail>>>()
    const olderPrevNextRequest = createDeferred<Awaited<ReturnType<typeof getArticlePrevNext>>>()
    const newerPrevNextRequest = createDeferred<Awaited<ReturnType<typeof getArticlePrevNext>>>()

    getArticleDetailMock
      .mockReturnValueOnce(olderArticleRequest.promise)
      .mockReturnValueOnce(newerArticleRequest.promise)
    getArticlePrevNextMock
      .mockReturnValueOnce(olderPrevNextRequest.promise)
      .mockReturnValueOnce(newerPrevNextRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/articles/21')
    await router.isReady()

    const wrapper = mount(ArticleDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await router.push('/articles/22')
    await flushPromises()

    newerArticleRequest.resolve({
      id: 22,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Current Article',
      summary: 'Current summary',
      coverUrl: '',
      contentMarkdown: '# Current',
      status: 'published',
      publishTime: '2026-05-13T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: [],
      tags: [],
    })
    newerPrevNextRequest.resolve({
      prev: { id: 21, title: 'Previous article' },
      next: null,
    })
    await flushPromises()

    olderArticleRequest.resolve({
      id: 21,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Stale Article',
      summary: 'Stale summary',
      coverUrl: '',
      contentMarkdown: '# Stale',
      status: 'published',
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      categories: [],
      tags: [],
    })
    olderPrevNextRequest.resolve({
      prev: null,
      next: { id: 22, title: 'Next article' },
    })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/articles/22')
    expect(wrapper.text()).toContain('Current Article')
    expect(wrapper.text()).not.toContain('Stale Article')
  })

  it('loads author profile and paginates published articles in publish-time desc order', async () => {
    getAuthorProfileMock.mockResolvedValue({
      id: 7,
      username: 'writer',
      nickname: 'Writer',
      avatarUrl: '/avatar.png',
      bio: 'Writes about Vue.',
    })
    getAuthorArticlesMock.mockResolvedValue({
      items: [
        {
          id: 31,
          authorId: 7,
          author: {
            id: 7,
            username: 'writer',
            nickname: 'Writer',
            avatarUrl: '/avatar.png',
          },
          title: 'Published Article',
          summary: 'Summary',
          coverUrl: '/cover.png',
          contentMarkdown: 'Body',
          status: 'published',
          publishTime: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 21,
        totalPages: 3,
      },
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/authors/7')
    await router.isReady()

    const wrapper = mount(AuthorProfileView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(router.currentRoute.value.params.id).toBe('7')
    expect(getAuthorProfileMock).toHaveBeenCalledWith(7)
    expect(getAuthorArticlesMock).toHaveBeenCalledWith(7, {
      page: 1,
      pageSize: 10,
      sortField: 'publishTime',
      sortOrder: 'desc',
    })
    expect(wrapper.text()).toContain('Writer')
    expect(wrapper.text()).toContain('Published Article')
  })

  it('keeps the author article list in a loading state after the profile resolves first', async () => {
    const authorArticlesRequest = createDeferred<Awaited<ReturnType<typeof getAuthorArticles>>>()

    getAuthorProfileMock.mockResolvedValue({
      id: 7,
      username: 'writer',
      nickname: 'Writer',
      avatarUrl: '/avatar.png',
      bio: 'Writes about Vue.',
    })
    getAuthorArticlesMock.mockReturnValue(authorArticlesRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/authors/7')
    await router.isReady()

    const wrapper = mount(AuthorProfileView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    try {
      expect(wrapper.text()).toContain('Writer')
      expect(wrapper.text()).toContain('加载文章')
      expect(wrapper.text()).not.toContain('暂无文章')
    } finally {
      authorArticlesRequest.resolve({
        items: [
          {
            id: 31,
            authorId: 7,
            author: {
              id: 7,
              username: 'writer',
              nickname: 'Writer',
              avatarUrl: '/avatar.png',
            },
            title: 'Loaded article',
            summary: 'Summary',
            coverUrl: '/cover.png',
            contentMarkdown: 'Body',
            status: 'published',
            publishTime: '2026-05-12T00:00:00.000Z',
            updatedAt: '2026-05-12T00:00:00.000Z',
          },
        ],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      })
      await flushPromises()
    }

    expect(wrapper.text()).toContain('Loaded article')
    expect(wrapper.text()).not.toContain('加载文章')
  })

  it('keeps the author profile visible when the initial article list fails', async () => {
    getAuthorProfileMock.mockResolvedValue({
      id: 7,
      username: 'writer',
      nickname: 'Writer',
      avatarUrl: '/avatar.png',
      bio: 'Writes about Vue.',
    })
    getAuthorArticlesMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/authors/7')
    await router.isReady()

    const wrapper = mount(AuthorProfileView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Writer')
    expect(wrapper.text()).toContain('Writes about Vue.')
    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).not.toContain('作者不可用')
  })

  it('keeps the current author profile visible when changing pages fails', async () => {
    getAuthorProfileMock.mockResolvedValue({
      id: 7,
      username: 'writer',
      nickname: 'Writer',
      avatarUrl: '/avatar.png',
      bio: 'Writes about Vue.',
    })
    getAuthorArticlesMock
      .mockResolvedValueOnce({
        items: [
          {
            id: 31,
            authorId: 7,
            author: {
              id: 7,
              username: 'writer',
              nickname: 'Writer',
              avatarUrl: '/avatar.png',
            },
            title: 'First page article',
            summary: 'Summary',
            coverUrl: '/cover.png',
            contentMarkdown: 'Body',
            status: 'published',
            publishTime: '2026-05-12T00:00:00.000Z',
            updatedAt: '2026-05-12T00:00:00.000Z',
          },
        ],
        meta: {
          page: 1,
          pageSize: 10,
          total: 21,
          totalPages: 3,
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
    await router.push('/authors/7')
    await router.isReady()

    const wrapper = mount(AuthorProfileView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()

    expect(getAuthorArticlesMock).toHaveBeenLastCalledWith(7, {
      page: 2,
      pageSize: 10,
      sortField: 'publishTime',
      sortOrder: 'desc',
    })
    expect(wrapper.text()).toContain('Writer')
    expect(wrapper.text()).toContain('First page article')
    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
  })

  it('keeps the author error state visible while retrying and clears it after a successful retry', async () => {
    let resolveRetry: ((value: Awaited<ReturnType<typeof getAuthorProfile>>) => void) | null = null
    const authorArticle = {
      id: 31,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Recovered article',
      summary: 'Summary',
      coverUrl: '/cover.png',
      contentMarkdown: 'Body',
      status: 'published' as const,
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    }

    getAuthorProfileMock
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'timeout',
          message: '请求超时，请稍后重试',
          retryable: true,
          shouldReport: true,
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve
          }),
      )
    getAuthorArticlesMock.mockResolvedValue({
      items: [authorArticle],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/authors/7')
    await router.isReady()

    const wrapper = mount(AuthorProfileView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')

    const retryButton = wrapper.get('.error-state__action')
    await retryButton.trigger('click')

    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(retryButton.text()).toBe('正在重试')

    resolveRetry?.({
      id: 7,
      username: 'writer',
      nickname: 'Writer',
      avatarUrl: '/avatar.png',
      bio: 'Writes about Vue.',
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Writer')
    expect(wrapper.text()).toContain('Recovered article')
    expect(wrapper.text()).not.toContain('请求超时，请稍后重试')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('rejects malformed author ids without requesting a partial numeric match', async () => {
    getAuthorProfileMock.mockResolvedValue({
      id: 7,
      username: 'writer',
      nickname: 'Writer',
      avatarUrl: '/avatar.png',
      bio: 'Writes about Vue.',
    })
    getAuthorArticlesMock.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/authors/7abc')
    await router.isReady()

    const wrapper = mount(AuthorProfileView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('无效的作者编号')
    expect(getAuthorProfileMock).not.toHaveBeenCalled()
    expect(getAuthorArticlesMock).not.toHaveBeenCalled()
  })

  it('ignores stale author profile responses after navigating to another author', async () => {
    const olderProfileRequest = createDeferred<Awaited<ReturnType<typeof getAuthorProfile>>>()
    const newerProfileRequest = createDeferred<Awaited<ReturnType<typeof getAuthorProfile>>>()
    const olderArticlesRequest = createDeferred<Awaited<ReturnType<typeof getAuthorArticles>>>()
    const newerArticlesRequest = createDeferred<Awaited<ReturnType<typeof getAuthorArticles>>>()

    getAuthorProfileMock
      .mockReturnValueOnce(olderProfileRequest.promise)
      .mockReturnValueOnce(newerProfileRequest.promise)
    getAuthorArticlesMock.mockImplementation((authorId) => {
      if (authorId === 8) {
        return newerArticlesRequest.promise
      }

      return olderArticlesRequest.promise
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/authors/7')
    await router.isReady()

    const wrapper = mount(AuthorProfileView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await router.push('/authors/8')
    await flushPromises()

    newerProfileRequest.resolve({
      id: 8,
      username: 'newer-writer',
      nickname: 'Newer Writer',
      avatarUrl: '/newer.png',
      bio: 'Newer bio.',
    })
    newerArticlesRequest.resolve({
      items: [
        {
          id: 41,
          authorId: 8,
          author: {
            id: 8,
            username: 'newer-writer',
            nickname: 'Newer Writer',
            avatarUrl: '/newer.png',
          },
          title: 'Newer article',
          summary: 'Summary',
          coverUrl: '',
          contentMarkdown: 'Body',
          status: 'published',
          publishTime: '2026-05-14T00:00:00.000Z',
          updatedAt: '2026-05-14T00:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    await flushPromises()

    olderProfileRequest.resolve({
      id: 7,
      username: 'stale-writer',
      nickname: 'Stale Writer',
      avatarUrl: '/stale.png',
      bio: 'Stale bio.',
    })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/authors/8')
    expect(wrapper.text()).toContain('Newer Writer')
    expect(wrapper.text()).toContain('Newer article')
    expect(wrapper.text()).not.toContain('Stale Writer')
    expect(wrapper.text()).not.toContain('Stale article')
    expect(getAuthorArticlesMock).not.toHaveBeenCalledWith(7, expect.anything())
  })
})
