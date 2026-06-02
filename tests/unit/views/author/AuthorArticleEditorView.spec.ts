import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import { HttpClientError } from '@/api/client'
import {
  createMyArticle,
  getMyArticleDetail,
  updateMyArticle,
} from '@/api/author-articles'
import { getCategories } from '@/api/categories'
import { ROUTE_NAMES } from '@/constants/routes'
import { createAppRouter } from '@/router'
import { useUserAuthStore } from '@/stores/userAuth'
import { getTags } from '@/api/tags'
import { setUserToken } from '@/utils/auth-storage'
import AuthorArticleEditorView from '@/views/author/AuthorArticleEditorView.vue'

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

const getMyArticleDetailMock = vi.mocked(getMyArticleDetail)
const createMyArticleMock = vi.mocked(createMyArticle)
const updateMyArticleMock = vi.mocked(updateMyArticle)
const getCategoriesMock = vi.mocked(getCategories)
const getTagsMock = vi.mocked(getTags)

const article = {
  id: 501,
  authorId: 9,
  author: {
    id: 9,
    username: 'writer',
    nickname: 'Writer',
    avatarUrl: '/avatar.png',
  },
  title: 'Existing article',
  summary: 'Summary',
  coverUrl: '',
  contentMarkdown: 'Body',
  status: 'draft' as const,
  publishTime: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
  categories: [],
  tags: [],
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

describe('AuthorArticleEditorView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    getMyArticleDetailMock.mockReset()
    createMyArticleMock.mockReset()
    updateMyArticleMock.mockReset()
    getCategoriesMock.mockReset()
    getTagsMock.mockReset()

    getCategoriesMock.mockResolvedValue([])
    getTagsMock.mockResolvedValue([])
  })

  it('shows recovery guidance when the initial article detail load fails', async () => {
    setUserToken('user-token')
    getMyArticleDetailMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
    expect(wrapper.text()).toContain('重新加载')
  })

  it('rejects malformed edit ids instead of requesting a partial numeric match', async () => {
    setUserToken('user-token')
    getMyArticleDetailMock.mockResolvedValue(article)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501abc/edit')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            template: '<div class="article-form-fields-stub">表单</div>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('无效的文章编号')
    expect(wrapper.text()).not.toContain('表单')
    expect(getMyArticleDetailMock).not.toHaveBeenCalled()
    expect(createMyArticleMock).not.toHaveBeenCalled()
    expect(updateMyArticleMock).not.toHaveBeenCalled()
  })

  it('shows timeout recovery guidance after save failure in edit mode', async () => {
    setUserToken('user-token')
    getMyArticleDetailMock.mockResolvedValue(article)
    updateMyArticleMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('button.author-article-editor-view__ghost').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('clears stale save errors when the author edits the form again', async () => {
    setUserToken('user-token')
    createMyArticleMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/new')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            emits: ['update:field'],
            template: `
              <div>
                <button
                  data-test="fill-form"
                  type="button"
                  @click="$emit('update:field', 'title', 'New article'); $emit('update:field', 'categoryIds', [1]); $emit('update:field', 'contentMarkdown', 'Body')"
                >
                  填写表单
                </button>
                <button
                  data-test="edit-title"
                  type="button"
                  @click="$emit('update:field', 'title', 'Edited title')"
                >
                  修改标题
                </button>
              </div>
            `,
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-test="fill-form"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === '发布文章')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')

    await wrapper.get('[data-test="edit-title"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('请求超时，请稍后重试')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('ignores duplicate article submissions while the first save is still pending', async () => {
    setUserToken('user-token')
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createMyArticle>>>()
    createMyArticleMock.mockReturnValue(saveRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/new')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            emits: ['update:field'],
            template: `
              <button
                data-test="fill-form"
                type="button"
                @click="$emit('update:field', 'title', 'New article'); $emit('update:field', 'categoryIds', [1]); $emit('update:field', 'contentMarkdown', 'Body')"
              >
                填写表单
              </button>
            `,
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-test="fill-form"]').trigger('click')

    const publishButton = wrapper.findAll('button').find((button) => button.text() === '发布文章')
    publishButton?.element.click()
    publishButton?.element.click()
    await flushPromises()

    expect(createMyArticleMock).toHaveBeenCalledTimes(1)
  })

  it('does not navigate after a create response started with an older user token', async () => {
    setUserToken('old-user-token')
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createMyArticle>>>()
    createMyArticleMock.mockReturnValueOnce(saveRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/new')
    await router.isReady()
    const pushSpy = vi.spyOn(router, 'push')
    const pinia = createPinia()
    const userAuthStore = useUserAuthStore(pinia)
    userAuthStore.token = 'old-user-token'

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          ArticleFormFields: {
            emits: ['update:field'],
            template: `
              <button
                data-test="fill-form"
                type="button"
                @click="$emit('update:field', 'title', 'New article'); $emit('update:field', 'categoryIds', [1]); $emit('update:field', 'contentMarkdown', 'Body')"
              >
                填写表单
              </button>
            `,
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-test="fill-form"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === '发布文章')?.trigger('click')
    await flushPromises()

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    saveRequest.resolve(article)
    await flushPromises()

    expect(pushSpy).not.toHaveBeenCalledWith({ name: ROUTE_NAMES.authorArticles })
    expect(wrapper.text()).not.toContain('保存文章失败')
  })

  it('does not navigate after an edit save response from a stale editor route', async () => {
    setUserToken('user-token')
    const saveRequest = createDeferred<Awaited<ReturnType<typeof updateMyArticle>>>()
    getMyArticleDetailMock.mockResolvedValue(article)
    updateMyArticleMock.mockReturnValueOnce(saveRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()
    const pushSpy = vi.spyOn(router, 'push')
    const pinia = createPinia()
    const userAuthStore = useUserAuthStore(pinia)
    userAuthStore.token = 'user-token'

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('button.author-article-editor-view__ghost').trigger('click')
    await flushPromises()

    await router.push('/writer/articles/new')
    await router.isReady()
    await flushPromises()

    saveRequest.resolve({
      ...article,
      title: 'Saved stale edit',
    })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/writer/articles/new')
    expect(pushSpy).not.toHaveBeenCalledWith({ name: ROUTE_NAMES.authorArticles })
    expect(wrapper.text()).not.toContain('保存文章失败')
  })

  it('does not show an edit save error from a stale editor route', async () => {
    setUserToken('user-token')
    const saveRequest = createDeferred<Awaited<ReturnType<typeof updateMyArticle>>>()
    getMyArticleDetailMock.mockResolvedValue(article)
    updateMyArticleMock.mockReturnValueOnce(saveRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()
    const pinia = createPinia()
    const userAuthStore = useUserAuthStore(pinia)
    userAuthStore.token = 'user-token'

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('button.author-article-editor-view__ghost').trigger('click')
    await flushPromises()

    await router.push('/writer/articles/new')
    await router.isReady()
    await flushPromises()

    saveRequest.reject(
      new HttpClientError({
        kind: 'timeout',
        message: '旧编辑保存超时',
        retryable: true,
        shouldReport: true,
      }),
    )
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/writer/articles/new')
    expect(wrapper.text()).not.toContain('旧编辑保存超时')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('does not show save errors from an older user token request', async () => {
    setUserToken('old-user-token')
    const saveRequest = createDeferred<Awaited<ReturnType<typeof updateMyArticle>>>()
    getMyArticleDetailMock.mockResolvedValue(article)
    updateMyArticleMock.mockReturnValueOnce(saveRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()
    const pinia = createPinia()
    const userAuthStore = useUserAuthStore(pinia)
    userAuthStore.token = 'old-user-token'

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          ArticleFormFields: {
            template: '<div />',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('button.author-article-editor-view__ghost').trigger('click')
    await flushPromises()

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    saveRequest.reject(
      new HttpClientError({
        kind: 'timeout',
        message: '旧保存请求超时',
        retryable: true,
        shouldReport: true,
      }),
    )
    await flushPromises()

    expect(wrapper.text()).not.toContain('旧保存请求超时')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('shows a retryable taxonomy error when category options fail to load on the new article form', async () => {
    setUserToken('user-token')
    getCategoriesMock.mockRejectedValueOnce(new Error('分类接口失败'))
    getTagsMock.mockResolvedValueOnce([])

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/new')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            template: '<div class="article-form-fields-stub">表单</div>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('分类接口失败')
    expect(wrapper.text()).toContain('分类或标签加载失败，请重试后再选择')
    expect(wrapper.text()).toContain('重新加载分类标签')
  })

  it('ignores stale taxonomy recovery guidance after a newer route load fails', async () => {
    setUserToken('user-token')
    const olderCategoryRequest = createDeferred<Awaited<ReturnType<typeof getCategories>>>()
    const olderTagRequest = createDeferred<Awaited<ReturnType<typeof getTags>>>()
    const newerCategoryRequest = createDeferred<Awaited<ReturnType<typeof getCategories>>>()
    const newerTagRequest = createDeferred<Awaited<ReturnType<typeof getTags>>>()

    getCategoriesMock
      .mockReturnValueOnce(olderCategoryRequest.promise)
      .mockReturnValueOnce(newerCategoryRequest.promise)
    getTagsMock
      .mockReturnValueOnce(olderTagRequest.promise)
      .mockReturnValueOnce(newerTagRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            template: '<div class="article-form-fields-stub">表单</div>',
          },
        },
      },
    })

    await flushPromises()
    await router.push('/writer/articles/new')
    await router.isReady()
    await flushPromises()

    newerCategoryRequest.reject(
      new HttpClientError({
        kind: 'network',
        message: '当前分类请求失败',
        retryable: true,
        shouldReport: true,
      }),
    )
    newerTagRequest.resolve([])
    await flushPromises()

    expect(wrapper.text()).toContain('当前分类请求失败')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')

    olderCategoryRequest.reject(
      new HttpClientError({
        kind: 'timeout',
        message: '旧分类请求失败',
        retryable: true,
        shouldReport: true,
      }),
    )
    olderTagRequest.resolve([])
    await flushPromises()

    expect(wrapper.text()).toContain('当前分类请求失败')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('resets the form when navigating from editing an article to creating a new one', async () => {
    setUserToken('user-token')
    getMyArticleDetailMock.mockResolvedValue(article)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            props: ['form'],
            template: '<div data-test="form-title">{{ form.title || "空标题" }}</div>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.get('[data-test="form-title"]').text()).toBe('Existing article')

    await router.push('/writer/articles/new')
    await router.isReady()
    await flushPromises()

    expect(wrapper.text()).toContain('新建文章')
    expect(wrapper.get('[data-test="form-title"]').text()).toBe('空标题')
  })

  it('ignores stale edit detail responses after navigating to the new article form', async () => {
    setUserToken('user-token')
    const detailRequest = createDeferred<Awaited<ReturnType<typeof getMyArticleDetail>>>()
    getMyArticleDetailMock.mockReturnValueOnce(detailRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            props: ['form'],
            template: '<div data-test="form-title">{{ form.title || "空标题" }}</div>',
          },
        },
      },
    })

    await flushPromises()
    await router.push('/writer/articles/new')
    await router.isReady()
    await flushPromises()

    detailRequest.resolve(article)
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('新建文章')
    expect(wrapper.get('[data-test="form-title"]').text()).toBe('空标题')
  })

  it('clears a stale edit load error when navigating to another article detail', async () => {
    setUserToken('user-token')
    const nextDetailRequest = createDeferred<Awaited<ReturnType<typeof getMyArticleDetail>>>()
    getMyArticleDetailMock
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'network',
          message: '网络连接失败，请检查网络或后端服务',
          retryable: true,
          shouldReport: true,
        }),
      )
      .mockReturnValueOnce(nextDetailRequest.promise)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            props: ['form'],
            template: '<div data-test="form-title">{{ form.title || "空标题" }}</div>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')

    await router.push('/writer/articles/502/edit')
    await router.isReady()
    await flushPromises()

    expect(getMyArticleDetailMock).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('正在加载文章内容')
    expect(wrapper.text()).not.toContain('网络连接失败，请检查网络或后端服务')

    nextDetailRequest.resolve({
      ...article,
      id: 502,
      title: 'Next article',
    })
    await flushPromises()

    expect(wrapper.get('[data-test="form-title"]').text()).toBe('Next article')
  })

  it('keeps the editor error state visible while retrying and clears it after detail loads successfully', async () => {
    setUserToken('user-token')
    let resolveRetry: ((value: typeof article) => void) | null = null

    getMyArticleDetailMock
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

    const router = createAppRouter(createMemoryHistory())
    await router.push('/writer/articles/501/edit')
    await router.isReady()

    const wrapper = mount(AuthorArticleEditorView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          ArticleFormFields: {
            template: '<div class="article-form-fields-stub">表单</div>',
          },
        },
      },
    })

    await flushPromises()

    const retryButton = wrapper.get('.error-state__action')
    await retryButton.trigger('click')

    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(retryButton.text()).toBe('正在重试')

    await flushPromises()
    resolveRetry?.(article)
    await flushPromises()
    await flushPromises()

    expect(getMyArticleDetailMock).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('表单')
    expect(wrapper.text()).not.toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).not.toContain('请检查网络或服务状态后重试')
  })
})
