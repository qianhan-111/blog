import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpClientError } from '@/api/client'
import {
  deleteAdminArticle,
  getAdminArticleDetail,
  getAdminArticles,
  updateAdminArticle,
} from '@/api/author-articles'
import { getCategories } from '@/api/categories'
import { getTags } from '@/api/tags'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { setAdminToken } from '@/utils/auth-storage'
import AdminArticlesView from '@/views/admin/AdminArticlesView.vue'

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

vi.mock('@/api/categories', () => ({
  getCategories: vi.fn(),
}))

vi.mock('@/api/tags', () => ({
  getTags: vi.fn(),
}))

const getAdminArticlesMock = vi.mocked(getAdminArticles)
const getAdminArticleDetailMock = vi.mocked(getAdminArticleDetail)
const deleteAdminArticleMock = vi.mocked(deleteAdminArticle)
const updateAdminArticleMock = vi.mocked(updateAdminArticle)
const getCategoriesMock = vi.mocked(getCategories)
const getTagsMock = vi.mocked(getTags)

const article = {
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

describe('AdminArticlesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getAdminArticlesMock.mockReset()
    getAdminArticleDetailMock.mockReset()
    deleteAdminArticleMock.mockReset()
    updateAdminArticleMock.mockReset()
    getCategoriesMock.mockReset()
    getTagsMock.mockReset()

    getCategoriesMock.mockResolvedValue([])
    getTagsMock.mockResolvedValue([])
  })

  it('shows a visible action error when deleting an article fails', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    deleteAdminArticleMock.mockRejectedValue(new Error('删除文章失败'))

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('删除文章失败')
  })

  it('reports article reload failure separately after a successful delete', async () => {
    getAdminArticlesMock
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
    deleteAdminArticleMock.mockResolvedValueOnce(null)

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    expect(deleteAdminArticleMock).toHaveBeenCalledWith(article.id)
    expect(wrapper.text()).toContain('文章已删除，但列表刷新失败')
    expect(wrapper.text()).toContain('列表刷新失败')
    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除')).toBe(false)
  })

  it('reports article reload failure separately after a successful save', async () => {
    getAdminArticlesMock
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
    getAdminArticleDetailMock.mockResolvedValueOnce({
      ...article,
      categories: [],
      tags: [],
    })
    updateAdminArticleMock.mockResolvedValueOnce({
      ...article,
      title: 'Saved admin article',
      categories: [],
      tags: [],
    })

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper
      .get('.admin-articles-view__panel')
      .findAll('button')
      .find((button) => button.text() === '编辑')
      ?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '保存草稿')?.trigger('click')
    await flushPromises()

    expect(updateAdminArticleMock).toHaveBeenCalledWith(article.id, expect.objectContaining({
      status: 'draft',
    }))
    expect(wrapper.text()).toContain('文章已保存，但列表刷新失败')
    expect(wrapper.text()).toContain('列表刷新失败')
    expect(wrapper.text()).not.toContain('保存文章失败')
  })

  it('does not leave edit mode after a save response started with an older admin token', async () => {
    setAdminToken('old-admin-token')
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateAdminArticle>>>()

    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock.mockResolvedValue({
      ...article,
      categories: [],
      tags: [],
    })
    updateAdminArticleMock.mockReturnValueOnce(updateRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = useAdminAuthStore(pinia)
    adminAuthStore.token = 'old-admin-token'
    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [pinia],
        stubs: {
          ArticleFormFields: {
            template: '<div data-test="edit-form" />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '保存草稿')?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    updateRequest.resolve({
      ...article,
      title: 'Old saved article',
      categories: [],
      tags: [],
    })
    await flushPromises()

    expect(wrapper.find('[data-test="edit-form"]').exists()).toBe(true)
  })

  it('does not show save errors from an older admin token request', async () => {
    setAdminToken('old-admin-token')
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateAdminArticle>>>()

    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock.mockResolvedValue({
      ...article,
      categories: [],
      tags: [],
    })
    updateAdminArticleMock.mockReturnValueOnce(updateRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = useAdminAuthStore(pinia)
    adminAuthStore.token = 'old-admin-token'
    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [pinia],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '保存草稿')?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    updateRequest.reject(
      new HttpClientError({
        kind: 'timeout',
        message: '旧管理员保存超时',
        retryable: true,
        shouldReport: true,
      }),
    )
    await flushPromises()

    expect(wrapper.text()).not.toContain('旧管理员保存超时')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('clears stale load errors after a successful delete reload leaves the admin list empty', async () => {
    getAdminArticlesMock
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
    deleteAdminArticleMock.mockResolvedValueOnce(null)

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('button.admin-articles-view__action').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('筛选文章失败')

    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    expect(deleteAdminArticleMock).toHaveBeenCalledWith(article.id)
    expect(wrapper.text()).toContain('当前没有匹配的文章')
    expect(wrapper.text()).not.toContain('筛选文章失败')
  })

  it('prevents duplicate admin article deletes while the confirmation is submitting', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteAdminArticle>>>()
    getAdminArticlesMock
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
    deleteAdminArticleMock.mockReturnValue(deleteRequest.promise)

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()

    const confirmButton = wrapper.findAll('button').find((button) => button.text() === '确认删除')
    await confirmButton?.trigger('click')
    await confirmButton?.trigger('click')

    expect(deleteAdminArticleMock).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('button').find((button) => button.text() === '处理中')?.attributes('disabled')).toBeDefined()

    deleteRequest.resolve(null)
    await flushPromises()
  })

  it('keeps the delete confirmation open after a delete response started with an older admin token', async () => {
    setAdminToken('old-admin-token')
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteAdminArticle>>>()
    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    deleteAdminArticleMock.mockReturnValueOnce(deleteRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = useAdminAuthStore(pinia)
    adminAuthStore.token = 'old-admin-token'
    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    deleteRequest.resolve(null)
    await flushPromises()

    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除')).toBe(true)
    expect(wrapper.text()).not.toContain('删除文章失败')
  })

  it('shows a visible error when loading article detail fails', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock.mockRejectedValue(new Error('文章详情加载失败'))

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('文章详情加载失败')
  })

  it('retries the failed article detail request instead of refreshing the list', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock
      .mockRejectedValueOnce(new Error('文章详情加载失败'))
      .mockResolvedValueOnce({
        ...article,
        categories: [],
        tags: [],
      })

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    await wrapper.get('.error-state__action').trigger('click')
    await flushPromises()

    expect(getAdminArticleDetailMock).toHaveBeenCalledTimes(2)
    expect(getAdminArticleDetailMock).toHaveBeenLastCalledWith(article.id)
    expect(getAdminArticlesMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Admin visible article')
    expect(wrapper.text()).not.toContain('文章详情加载失败')
  })

  it('shows recovery guidance when the initial article list load fails', async () => {
    getAdminArticlesMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')
    expect(wrapper.text()).toContain('重新加载')
  })

  it('shows a retry action when taxonomy options fail to load', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getCategoriesMock.mockRejectedValueOnce(new Error('分类接口失败'))
    getTagsMock.mockResolvedValueOnce([])

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('分类接口失败')
    expect(wrapper.text()).toContain('分类或标签加载失败，请重试后再选择')
    expect(wrapper.text()).toContain('重新加载分类标签')
  })

  it('keeps the current article list visible and shows network retry guidance when refreshing fails', async () => {
    getAdminArticlesMock
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

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('button.admin-articles-view__action').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Admin visible article')
    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
  })

  it('loads the next admin article page from the pagination controls', async () => {
    getAdminArticlesMock
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
            id: 302,
            title: 'Second page admin article',
          },
        ],
        meta: {
          page: 2,
          pageSize: 20,
          total: 21,
          totalPages: 2,
        },
      })

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()

    expect(getAdminArticlesMock).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
    })
    expect(wrapper.text()).toContain('Second page admin article')
  })

  it('keeps the previous admin article page selected when loading the next page fails', async () => {
    getAdminArticlesMock
      .mockResolvedValueOnce({
        items: [article],
        meta: {
          page: 1,
          pageSize: 20,
          total: 21,
          totalPages: 2,
        },
      })
      .mockRejectedValueOnce(new Error('全站文章加载失败'))

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()

    const activePages = wrapper.findAll('.admin-articles-view__page-button.is-active').map((button) => button.text())

    expect(getAdminArticlesMock).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
    })
    expect(wrapper.text()).toContain('Admin visible article')
    expect(wrapper.text()).toContain('全站文章加载失败')
    expect(activePages).toEqual(['1'])
  })

  it('keeps the current admin article page selected when applying filters fails from a later page', async () => {
    const secondPageArticle = {
      ...article,
      id: 302,
      title: 'Second page admin article',
    }

    getAdminArticlesMock
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

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()
    await wrapper.get('input[type="search"]').setValue('admin')
    await wrapper.get('button.admin-articles-view__action').trigger('click')
    await flushPromises()

    const activePages = wrapper.findAll('.admin-articles-view__page-button.is-active').map((button) => button.text())

    expect(getAdminArticlesMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      keyword: 'admin',
    })
    expect(wrapper.text()).toContain('Second page admin article')
    expect(wrapper.text()).toContain('筛选文章失败')
    expect(activePages).toEqual(['2'])
  })

  it('does not let a stale failed admin filter request roll back a newer successful page change', async () => {
    const staleFilterRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const newerPageRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()
    const secondPageArticle = {
      ...article,
      id: 302,
      title: 'Newer admin page article',
    }

    getAdminArticlesMock
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

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input[type="search"]').setValue('admin')
    wrapper.get('button.admin-articles-view__action').element.click()
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

    const activePages = wrapper.findAll('.admin-articles-view__page-button.is-active').map((button) => button.text())

    expect(wrapper.text()).toContain('Newer admin page article')
    expect(activePages).toEqual(['2'])
    expect(wrapper.text()).not.toContain('筛选文章失败')
  })

  it('keeps the article error state visible while retrying and clears it after a successful retry', async () => {
    let resolveRetry:
      | ((
          value: {
            items: typeof article[]
            meta: { page: number; pageSize: number; total: number; totalPages: number }
          },
        ) => void)
      | null = null

    getAdminArticlesMock
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

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
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

    expect(wrapper.text()).toContain('Admin visible article')
    expect(wrapper.text()).not.toContain('请求超时，请稍后重试')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('keeps the current article detail visible when a later detail request fails', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock
      .mockResolvedValueOnce({
        ...article,
        categories: [],
        tags: [],
      })
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'timeout',
          message: '请求超时，请稍后重试',
          retryable: true,
          shouldReport: true,
        }),
      )

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Admin visible article')
    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('clears stale article detail when loading a different article fails', async () => {
    const secondArticle = {
      ...article,
      id: 302,
      title: 'Second admin article',
    }

    getAdminArticlesMock.mockResolvedValue({
      items: [article, secondArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock
      .mockResolvedValueOnce({
        ...article,
        categories: [],
        tags: [],
      })
      .mockRejectedValueOnce(new Error('第二篇文章详情加载失败'))

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    const detailButtons = wrapper
      .get('.admin-articles-view__panel')
      .findAll('button')
      .filter((button) => button.text() === '查看')

    await detailButtons[0].trigger('click')
    await flushPromises()
    expect(wrapper.get('.admin-articles-view__detail').text()).toContain('Admin visible article')

    await detailButtons[1].trigger('click')
    await flushPromises()

    const detailText = wrapper.get('.admin-articles-view__detail').text()
    expect(detailText).toContain('第二篇文章详情加载失败')
    expect(detailText).not.toContain('Admin visible article')
  })

  it('clears the selected article detail when refreshed results no longer contain it', async () => {
    const filteredArticle = {
      ...article,
      id: 302,
      title: 'Filtered admin article',
    }

    getAdminArticlesMock
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
        items: [filteredArticle],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })
    getAdminArticleDetailMock.mockResolvedValue({
      ...article,
      categories: [],
      tags: [],
    })

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    expect(wrapper.get('.admin-articles-view__detail').text()).toContain('Admin visible article')

    await wrapper.get('input[type="search"]').setValue('filtered')
    await wrapper.get('button.admin-articles-view__action').trigger('click')
    await flushPromises()

    const detailText = wrapper.get('.admin-articles-view__detail').text()
    expect(wrapper.text()).toContain('Filtered admin article')
    expect(detailText).toContain('请选择一篇文章')
    expect(detailText).not.toContain('Admin visible article')
  })

  it('ignores stale admin article detail failures after a newer detail request resolves', async () => {
    const secondArticle = {
      ...article,
      id: 302,
      title: 'Current admin article',
    }
    const olderRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticleDetail>>>()
    const newerRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticleDetail>>>()

    getAdminArticlesMock.mockResolvedValue({
      items: [article, secondArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    const detailButtons = wrapper
      .get('.admin-articles-view__panel')
      .findAll('button')
      .filter((button) => button.text() === '查看')

    await detailButtons[0].trigger('click')
    await detailButtons[1].trigger('click')
    await flushPromises()

    newerRequest.resolve({
      ...secondArticle,
      categories: [],
      tags: [],
    })
    await flushPromises()

    olderRequest.reject(new Error('过期的文章详情失败'))
    await flushPromises()

    const detailText = wrapper.get('.admin-articles-view__detail').text()
    expect(detailText).toContain('Current admin article')
    expect(detailText).not.toContain('过期的文章详情失败')
    expect(detailText).not.toContain('获取文章详情失败')
  })

  it('clears stale admin article save errors when editing the form again', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock.mockResolvedValue({
      ...article,
      categories: [],
      tags: [],
    })
    updateAdminArticleMock.mockRejectedValue(new Error('保存文章失败'))

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ArticleFormFields: {
            props: ['form'],
            emits: ['update:field'],
            template: `
              <div>
                <button data-test="edit-title" type="button" @click="$emit('update:field', 'title', 'Updated title')">
                  修改标题
                </button>
              </div>
            `,
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '保存草稿')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('保存文章失败')

    await wrapper.get('[data-test="edit-title"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('保存文章失败')
  })

  it('clears stale admin detail load errors after saving the current article', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock
      .mockResolvedValueOnce({
        ...article,
        categories: [],
        tags: [],
      })
      .mockRejectedValueOnce(new Error('详情刷新失败'))
    updateAdminArticleMock.mockResolvedValueOnce({
      ...article,
      title: 'Saved admin article',
      categories: [],
      tags: [],
    })

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('详情刷新失败')

    await wrapper
      .get('.admin-articles-view__detail')
      .findAll('button')
      .find((button) => button.text() === '编辑')
      ?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '保存草稿')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Saved admin article')
    expect(wrapper.text()).not.toContain('详情刷新失败')
  })

  it('clears stale selected-article detail errors after deleting that article', async () => {
    const secondArticle = {
      ...article,
      id: 302,
      title: 'Second admin article',
    }

    getAdminArticlesMock
      .mockResolvedValueOnce({
        items: [article, secondArticle],
        meta: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
        },
      })
      .mockResolvedValueOnce({
        items: [secondArticle],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })
    getAdminArticleDetailMock
      .mockResolvedValueOnce({
        ...article,
        categories: [],
        tags: [],
      })
      .mockRejectedValueOnce(new Error('详情刷新失败'))
    deleteAdminArticleMock.mockResolvedValueOnce(null)

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    const firstRowButtons = wrapper
      .findAll('.admin-articles-view__table-row')
      .find((row) => row.text().includes('Admin visible article'))
      ?.findAll('button')

    await firstRowButtons?.find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    await firstRowButtons?.find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()

    expect(wrapper.get('.admin-articles-view__detail').text()).toContain('详情刷新失败')

    await firstRowButtons?.find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    const detailText = wrapper.get('.admin-articles-view__detail').text()
    expect(deleteAdminArticleMock).toHaveBeenCalledWith(article.id)
    expect(wrapper.text()).toContain('Second admin article')
    expect(detailText).toContain('请选择一篇文章')
    expect(detailText).not.toContain('详情刷新失败')
  })

  it('refreshes the admin article list after saving an article that no longer matches active filters', async () => {
    getAdminArticlesMock
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
    getAdminArticleDetailMock.mockResolvedValue({
      ...article,
      categories: [
        {
          id: 1,
          name: 'Vue',
          description: 'Vue articles',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      tags: [],
    })
    updateAdminArticleMock.mockResolvedValue({
      ...article,
      status: 'published',
      categories: [
        {
          id: 1,
          name: 'Vue',
          description: 'Vue articles',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      tags: [],
    })

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '保存并发布')?.trigger('click')
    await flushPromises()

    expect(updateAdminArticleMock).toHaveBeenCalledWith(article.id, expect.objectContaining({
      status: 'published',
    }))
    expect(getAdminArticlesMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
    })
    expect(wrapper.text()).toContain('当前没有匹配的文章')
  })

  it('ignores duplicate admin article save submissions while the first update is still pending', async () => {
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateAdminArticle>>>()

    getAdminArticlesMock.mockResolvedValue({
      items: [article],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock.mockResolvedValue({
      ...article,
      categories: [],
      tags: [],
    })
    updateAdminArticleMock.mockReturnValue(updateRequest.promise)

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await flushPromises()

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '保存草稿')
    saveButton?.element.click()
    saveButton?.element.click()
    await flushPromises()

    expect(updateAdminArticleMock).toHaveBeenCalledTimes(1)
  })

  it('does not leave a newer article edit after an older save response resolves', async () => {
    const secondArticle = {
      ...article,
      id: 302,
      title: 'Current admin edit article',
    }
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateAdminArticle>>>()
    const reloadRequest = createDeferred<Awaited<ReturnType<typeof getAdminArticles>>>()

    getAdminArticlesMock
      .mockResolvedValueOnce({
        items: [article, secondArticle],
        meta: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
        },
      })
      .mockReturnValueOnce(reloadRequest.promise)
    getAdminArticleDetailMock
      .mockResolvedValueOnce({
        ...article,
        categories: [],
        tags: [],
      })
      .mockResolvedValueOnce({
        ...secondArticle,
        categories: [],
        tags: [],
      })
    updateAdminArticleMock.mockReturnValueOnce(updateRequest.promise)

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ArticleFormFields: {
            template: '<div data-test="edit-form" />',
          },
        },
      },
    })

    await flushPromises()
    const editButtons = wrapper
      .get('.admin-articles-view__panel')
      .findAll('button')
      .filter((button) => button.text() === '编辑')

    await editButtons[0].trigger('click')
    await flushPromises()
    wrapper.findAll('button').find((button) => button.text() === '保存草稿')?.element.click()
    await flushPromises()

    await editButtons[1].trigger('click')
    await flushPromises()

    updateRequest.resolve({
      ...article,
      title: 'Older saved article',
      categories: [],
      tags: [],
    })
    reloadRequest.resolve({
      items: [article, secondArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      },
    })
    await flushPromises()

    const detailText = wrapper.get('.admin-articles-view__detail').text()
    expect(detailText).toContain('Current admin edit article')
    expect(detailText).not.toContain('Older saved article')
    expect(wrapper.find('[data-test="edit-form"]').exists()).toBe(true)
  })

  it('does not show an older save error after switching to a newer article edit', async () => {
    const secondArticle = {
      ...article,
      id: 302,
      title: 'Current admin edit article',
    }
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateAdminArticle>>>()

    getAdminArticlesMock.mockResolvedValue({
      items: [article, secondArticle],
      meta: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock
      .mockResolvedValueOnce({
        ...article,
        categories: [],
        tags: [],
      })
      .mockResolvedValueOnce({
        ...secondArticle,
        categories: [],
        tags: [],
      })
    updateAdminArticleMock.mockReturnValueOnce(updateRequest.promise)

    const wrapper = mount(AdminArticlesView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ArticleFormFields: {
            template: '<div data-test="edit-form" />',
          },
        },
      },
    })

    await flushPromises()
    const editButtons = wrapper
      .get('.admin-articles-view__panel')
      .findAll('button')
      .filter((button) => button.text() === '编辑')

    await editButtons[0].trigger('click')
    await flushPromises()
    wrapper.findAll('button').find((button) => button.text() === '保存草稿')?.element.click()
    await flushPromises()

    await editButtons[1].trigger('click')
    await flushPromises()

    updateRequest.reject(
      new HttpClientError({
        kind: 'timeout',
        message: '旧管理员保存超时',
        retryable: true,
        shouldReport: true,
      }),
    )
    await flushPromises()

    const detailText = wrapper.get('.admin-articles-view__detail').text()
    expect(detailText).toContain('Current admin edit article')
    expect(detailText).not.toContain('旧管理员保存超时')
    expect(detailText).not.toContain('可稍后重试，若持续失败请检查网络连接')
    expect(wrapper.find('[data-test="edit-form"]').exists()).toBe(true)
  })
})
