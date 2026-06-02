import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpClientError } from '@/api/client'
import { deleteMyArticle, getMyArticles } from '@/api/author-articles'
import { useUserAuthStore } from '@/stores/userAuth'
import { clearUserToken, setUserToken } from '@/utils/auth-storage'
import AuthorArticlesView from '@/views/author/AuthorArticlesView.vue'

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

function seedUserSession(pinia: ReturnType<typeof createPinia>, token = 'user-token') {
  setUserToken(token)
  const userAuthStore = useUserAuthStore(pinia)
  userAuthStore.token = token

  return userAuthStore
}

describe('AuthorArticlesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getMyArticlesMock.mockReset()
    deleteMyArticleMock.mockReset()
    clearUserToken()
  })

  it('renders the list error state when the initial load fails', async () => {
    getMyArticlesMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')
    expect(wrapper.text()).toContain('重新加载')
  })

  it('shows a visible action error when deleting an article fails', async () => {
    getMyArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    deleteMyArticleMock.mockRejectedValue(new Error('删除文章失败'))

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('删除文章失败')
  })

  it('does not link draft articles to the public article detail page', async () => {
    getMyArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :data-to="to"><slot /></a>',
          },
        },
      },
    })

    await flushPromises()

    const publicDetailLinks = wrapper
      .findAll('a')
      .filter((link) => link.attributes('data-to') === `/articles/${article.id}`)

    expect(publicDetailLinks).toEqual([])
    expect(wrapper.findAll('a').some((link) => link.attributes('data-to') === `/writer/articles/${article.id}/edit`)).toBe(true)
  })

  it('closes the delete confirmation when the delete succeeds but list refresh fails', async () => {
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
      .mockRejectedValueOnce(new Error('列表刷新失败'))
    deleteMyArticleMock.mockResolvedValueOnce(null)

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    expect(deleteMyArticleMock).toHaveBeenCalledWith(article.id)
    expect(wrapper.text()).toContain('文章已删除，但列表刷新失败')
    expect(wrapper.text()).toContain('列表刷新失败')
    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除')).toBe(false)
  })

  it('prevents duplicate author article deletes while the confirmation is submitting', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteMyArticle>>>()
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
      .mockResolvedValueOnce({
        items: [],
        meta: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
        },
      })
    deleteMyArticleMock.mockReturnValue(deleteRequest.promise)

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()

    const confirmButton = wrapper.findAll('button').find((button) => button.text() === '确认删除')
    await confirmButton?.trigger('click')
    await confirmButton?.trigger('click')

    expect(deleteMyArticleMock).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('button').find((button) => button.text() === '处理中')?.attributes('disabled')).toBeDefined()

    deleteRequest.resolve(null)
    await flushPromises()
  })

  it('keeps the delete confirmation open after a delete response started with an older user token', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteMyArticle>>>()
    getMyArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    deleteMyArticleMock.mockReturnValueOnce(deleteRequest.promise)

    const pinia = createPinia()
    const userAuthStore = seedUserSession(pinia, 'old-user-token')
    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [pinia],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    deleteRequest.resolve(null)
    await flushPromises()

    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除')).toBe(true)
    expect(wrapper.text()).toContain('Draft article')
    expect(wrapper.text()).not.toContain('删除文章失败')
  })

  it('does not show delete errors from an older user token request', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteMyArticle>>>()
    getMyArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    deleteMyArticleMock.mockReturnValueOnce(deleteRequest.promise)

    const pinia = createPinia()
    const userAuthStore = seedUserSession(pinia, 'old-user-token')
    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [pinia],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    deleteRequest.reject(new Error('旧删除请求失败'))
    await flushPromises()

    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除')).toBe(true)
    expect(wrapper.text()).not.toContain('旧删除请求失败')
    expect(wrapper.text()).not.toContain('删除文章失败')
  })

  it('keeps the current list visible and shows retry guidance when filter refresh fails', async () => {
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
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'network',
          message: '网络连接失败，请检查网络或后端服务',
          retryable: true,
          shouldReport: true,
        }),
      )

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('button.author-articles-view__action').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Draft article')
    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
  })

  it('loads the next author article page from the pagination controls', async () => {
    getMyArticlesMock
      .mockResolvedValueOnce({
        items: [article],
        meta: {
          page: 1,
          pageSize: 20,
          total: 21,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            ...article,
            id: 102,
            title: 'Second page draft',
          },
        ],
        meta: {
          page: 2,
          pageSize: 20,
          total: 21,
          totalPages: 2,
        },
      })

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()

    expect(getMyArticlesMock).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
    })
    expect(wrapper.text()).toContain('Second page draft')
  })

  it('keeps the previous author article page selected when loading the next page fails', async () => {
    getMyArticlesMock
      .mockResolvedValueOnce({
        items: [article],
        meta: {
          page: 1,
          pageSize: 20,
          total: 21,
          totalPages: 2,
        },
      })
      .mockRejectedValueOnce(new Error('作者文章加载失败'))

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()

    const activePages = wrapper.findAll('.author-articles-view__page-button.is-active').map((button) => button.text())

    expect(getMyArticlesMock).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
    })
    expect(wrapper.text()).toContain('Draft article')
    expect(wrapper.text()).toContain('作者文章加载失败')
    expect(activePages).toEqual(['1'])
  })

  it('keeps the current author article page selected when applying filters fails from a later page', async () => {
    const secondPageArticle = {
      ...article,
      id: 102,
      title: 'Second page draft',
    }

    getMyArticlesMock
      .mockResolvedValueOnce({
        items: [article],
        meta: {
          page: 1,
          pageSize: 20,
          total: 21,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [secondPageArticle],
        meta: {
          page: 2,
          pageSize: 20,
          total: 21,
          totalPages: 2,
        },
      })
      .mockRejectedValueOnce(new Error('筛选文章失败'))

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()
    await wrapper.get('input[type="search"]').setValue('draft')
    await wrapper.get('button.author-articles-view__action').trigger('click')
    await flushPromises()

    const activePages = wrapper.findAll('.author-articles-view__page-button.is-active').map((button) => button.text())

    expect(getMyArticlesMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      keyword: 'draft',
    })
    expect(wrapper.text()).toContain('Second page draft')
    expect(wrapper.text()).toContain('筛选文章失败')
    expect(activePages).toEqual(['2'])
  })

  it('does not let a stale failed filter request roll back a newer successful page change', async () => {
    const staleFilterRequest = createDeferred<Awaited<ReturnType<typeof getMyArticles>>>()
    const newerPageRequest = createDeferred<Awaited<ReturnType<typeof getMyArticles>>>()
    const secondPageArticle = {
      ...article,
      id: 102,
      title: 'Newer page draft',
    }

    getMyArticlesMock
      .mockResolvedValueOnce({
        items: [article],
        meta: {
          page: 2,
          pageSize: 20,
          total: 21,
          totalPages: 2,
        },
      })
      .mockReturnValueOnce(staleFilterRequest.promise)
      .mockReturnValueOnce(newerPageRequest.promise)

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('input[type="search"]').setValue('draft')
    wrapper.get('button.author-articles-view__action').element.click()
    await flushPromises()
    wrapper.findAll('button').find((button) => button.text() === '2')?.element.click()
    await flushPromises()

    newerPageRequest.resolve({
      items: [secondPageArticle],
      meta: {
        page: 2,
        pageSize: 20,
        total: 21,
        totalPages: 2,
      },
    })
    await flushPromises()

    staleFilterRequest.reject(new Error('筛选文章失败'))
    await flushPromises()

    const activePages = wrapper.findAll('.author-articles-view__page-button.is-active').map((button) => button.text())

    expect(wrapper.text()).toContain('Newer page draft')
    expect(activePages).toEqual(['2'])
    expect(wrapper.text()).not.toContain('筛选文章失败')
    expect(wrapper.text()).not.toContain('获取文章列表失败')
  })

  it('disables retry while retrying and clears the recovery prompt after a successful retry', async () => {
    let resolveRetry: ((value: { items: typeof article[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }) => void) | null = null

    getMyArticlesMock
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

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()

    const retryButton = wrapper.get('.error-state__action')
    await retryButton.trigger('click')

    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(retryButton.text()).toBe('正在重试')

    resolveRetry?.({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Draft article')
    expect(wrapper.text()).not.toContain('请求超时，请稍后重试')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('clears stale load errors after a successful delete reload leaves the list empty', async () => {
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
      .mockRejectedValueOnce(new Error('筛选文章失败'))
      .mockResolvedValueOnce({
        items: [],
        meta: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
        },
      })
    deleteMyArticleMock.mockResolvedValueOnce(null)

    const wrapper = mount(AuthorArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('button.author-articles-view__action').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('筛选文章失败')

    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    expect(deleteMyArticleMock).toHaveBeenCalledWith(article.id)
    expect(wrapper.text()).toContain('当前没有匹配的文章')
    expect(wrapper.text()).not.toContain('筛选文章失败')
  })
})
