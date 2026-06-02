import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import { HttpClientError } from '@/api/client'
import { createCategory, deleteCategory, getCategories } from '@/api/categories'
import { createTag, deleteTag, getTags } from '@/api/tags'
import { deleteAdminUser, getAdminUserDetail, getAdminUsers } from '@/api/users'
import { createAppRouter } from '@/router'
import { useCategoriesStore } from '@/stores/categories'
import { useTagsStore } from '@/stores/tags'
import AdminCategoriesView from '@/views/admin/AdminCategoriesView.vue'
import AdminTagsView from '@/views/admin/AdminTagsView.vue'
import AdminUsersView from '@/views/admin/AdminUsersView.vue'

vi.mock('@/api/categories', () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

vi.mock('@/api/tags', () => ({
  getTags: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}))

vi.mock('@/api/users', () => ({
  getAdminUsers: vi.fn(),
  getAdminUserDetail: vi.fn(),
  updateAdminUserStatus: vi.fn(),
  deleteAdminUser: vi.fn(),
}))

const getCategoriesMock = vi.mocked(getCategories)
const createCategoryMock = vi.mocked(createCategory)
const deleteCategoryMock = vi.mocked(deleteCategory)
const getTagsMock = vi.mocked(getTags)
const createTagMock = vi.mocked(createTag)
const deleteTagMock = vi.mocked(deleteTag)
const getAdminUsersMock = vi.mocked(getAdminUsers)
const getAdminUserDetailMock = vi.mocked(getAdminUserDetail)
const deleteAdminUserMock = vi.mocked(deleteAdminUser)
const category = {
  id: 11,
  name: 'Vue',
  description: 'Vue articles',
}
const tag = {
  id: 21,
  name: 'Pinia',
  createdAt: '2026-05-12T00:00:00.000Z',
}
const user = {
  id: 7,
  username: 'author-7',
  email: 'author7@example.com',
  nickname: 'Author Seven',
  avatarUrl: '/avatar.png',
  bio: 'Bio',
  role: 'author' as const,
  status: 'enabled' as const,
  createdAt: '2026-05-10T00:00:00.000Z',
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

describe('admin load error states', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getCategoriesMock.mockReset()
    createCategoryMock.mockReset()
    deleteCategoryMock.mockReset()
    getTagsMock.mockReset()
    createTagMock.mockReset()
    deleteTagMock.mockReset()
    getAdminUsersMock.mockReset()
    getAdminUserDetailMock.mockReset()
    deleteAdminUserMock.mockReset()
  })

  it('renders category load errors without leaking an unhandled rejection on mount', async () => {
    getCategoriesMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')
    expect(wrapper.text()).toContain('重新加载')
  })

  it('renders tag load errors without leaking an unhandled rejection on mount', async () => {
    getTagsMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
    expect(wrapper.text()).toContain('重新加载')
  })

  it('renders user list errors without leaking an unhandled rejection on mount', async () => {
    getAdminUsersMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/users')
    await router.isReady()

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
    expect(wrapper.text()).toContain('重新加载')
  })

  it('keeps the current user list visible and shows timeout guidance when reloading fails', async () => {
    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      })
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'timeout',
          message: '请求超时，请稍后重试',
          retryable: true,
          shouldReport: true,
        }),
      )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/users')
    await router.isReady()

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    await wrapper.get('button.admin-users-view__action').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Author Seven')
    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('keeps the error state visible while retrying users and clears it after a successful retry', async () => {
    let resolveRetry:
      | ((
          value: {
            items: typeof user[]
            meta: { page: number; pageSize: number; total: number; totalPages: number }
          },
        ) => void)
      | null = null

    getAdminUsersMock
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
    await router.push('/admin/users')
    await router.isReady()

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    const retryButton = wrapper.get('.error-state__action')
    await retryButton.trigger('click')

    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(retryButton.text()).toBe('正在重试')

    resolveRetry?.({
      items: [user],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Author Seven')
    expect(wrapper.text()).not.toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).not.toContain('请检查网络或服务状态后重试')
  })

  it('keeps the category error state visible while retrying and clears it after a successful retry', async () => {
    let resolveRetry: ((value: typeof category[]) => void) | null = null

    getCategoriesMock
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

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    const retryButton = wrapper.get('.error-state__action')
    await retryButton.trigger('click')

    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(retryButton.text()).toBe('正在重试')

    resolveRetry?.([category])
    await flushPromises()

    expect(wrapper.text()).toContain('Vue')
    expect(wrapper.text()).not.toContain('请求超时，请稍后重试')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('clears stale category recovery guidance before the next validation error', async () => {
    getCategoriesMock.mockResolvedValue([category])
    createCategoryMock.mockRejectedValueOnce(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input').setValue('React')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')

    await wrapper.get('input').setValue('')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('分类名称不能为空')
    expect(wrapper.text()).not.toContain('请检查网络或服务状态后重试')
  })

  it('clears stale category save errors when editing the form again', async () => {
    getCategoriesMock.mockResolvedValue([category])
    createCategoryMock.mockRejectedValueOnce(new Error('分类名称已存在'))

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input').setValue('Vue')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('分类名称已存在')

    await wrapper.get('input').setValue('React')
    await flushPromises()

    expect(wrapper.text()).not.toContain('分类名称已存在')
  })

  it('reports category reload failure separately after a successful create', async () => {
    getCategoriesMock
      .mockResolvedValueOnce([category])
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'network',
          message: '网络连接失败，请检查网络或后端服务',
          retryable: true,
          shouldReport: true,
        }),
      )
    createCategoryMock.mockResolvedValueOnce({
      id: 12,
      name: 'React',
      description: 'React articles',
      createdAt: '2026-05-12T00:00:00.000Z',
    })

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input').setValue('React')
    await wrapper.get('textarea').setValue('React articles')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(createCategoryMock).toHaveBeenCalledWith({
      name: 'React',
      description: 'React articles',
    })
    expect(wrapper.text()).toContain('分类已保存，但列表刷新失败')
    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).not.toContain('分类保存失败')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('')
  })

  it('does not show a stale category save reload error after a newer refresh succeeds', async () => {
    const staleSaveReload = createDeferred<Awaited<ReturnType<typeof getCategories>>>()
    const refreshedCategory = {
      id: 12,
      name: 'React',
      description: 'React articles',
    }

    getCategoriesMock
      .mockResolvedValueOnce([category])
      .mockReturnValueOnce(staleSaveReload.promise)
      .mockResolvedValueOnce([refreshedCategory])
    createCategoryMock.mockResolvedValueOnce({
      id: 12,
      name: 'React',
      description: 'React articles',
      createdAt: '2026-05-12T00:00:00.000Z',
    })

    const pinia = createPinia()
    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [pinia],
      },
    })
    const categoriesStore = useCategoriesStore(pinia)

    await flushPromises()
    await wrapper.get('input').setValue('React')
    await wrapper.get('textarea').setValue('React articles')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    await categoriesStore.fetchAll(true)
    await flushPromises()

    staleSaveReload.reject(new Error('旧分类保存刷新失败'))
    await flushPromises()

    expect(wrapper.text()).toContain('React')
    expect(wrapper.text()).not.toContain('分类已保存，但列表刷新失败')
    expect(wrapper.text()).not.toContain('旧分类保存刷新失败')
  })

  it('reports category reload failure separately after a successful delete', async () => {
    getCategoriesMock
      .mockResolvedValueOnce([category])
      .mockRejectedValueOnce(new Error('分类列表刷新失败'))
    deleteCategoryMock.mockResolvedValueOnce(null)

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    expect(deleteCategoryMock).toHaveBeenCalledWith(category.id)
    expect(wrapper.text()).toContain('分类已删除，但列表刷新失败')
    expect(wrapper.text()).toContain('分类列表刷新失败')
    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除')).toBe(false)
  })

  it('does not show a stale category delete reload error after a newer refresh succeeds', async () => {
    const staleDeleteReload = createDeferred<Awaited<ReturnType<typeof getCategories>>>()
    const refreshedCategory = {
      id: 12,
      name: 'React',
      description: 'React articles',
    }

    getCategoriesMock
      .mockResolvedValueOnce([category])
      .mockReturnValueOnce(staleDeleteReload.promise)
      .mockResolvedValueOnce([refreshedCategory])
    deleteCategoryMock.mockResolvedValueOnce(null)

    const pinia = createPinia()
    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [pinia],
      },
    })
    const categoriesStore = useCategoriesStore(pinia)

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    await categoriesStore.fetchAll(true)
    await flushPromises()

    staleDeleteReload.reject(new Error('旧分类删除刷新失败'))
    await flushPromises()

    expect(wrapper.text()).toContain('React')
    expect(wrapper.text()).not.toContain('分类已删除，但列表刷新失败')
    expect(wrapper.text()).not.toContain('旧分类删除刷新失败')
  })

  it('prevents duplicate category deletes while the confirmation is submitting', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteCategory>>>()
    getCategoriesMock
      .mockResolvedValueOnce([category])
      .mockResolvedValueOnce([])
    deleteCategoryMock.mockReturnValue(deleteRequest.promise)

    const wrapper = mount(AdminCategoriesView, {
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

    expect(deleteCategoryMock).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('button').find((button) => button.text() === '处理中')?.attributes('disabled')).toBeDefined()

    deleteRequest.resolve(null)
    await flushPromises()
  })

  it('prevents duplicate category saves while the first submission is still pending', async () => {
    const createRequest = createDeferred<Awaited<ReturnType<typeof createCategory>>>()
    getCategoriesMock.mockResolvedValueOnce([category])
    createCategoryMock.mockReturnValue(createRequest.promise)

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input').setValue('React')

    const submitButton = wrapper.get('button.taxonomy-view__primary')
    submitButton.element.click()
    submitButton.element.click()
    await flushPromises()

    expect(createCategoryMock).toHaveBeenCalledTimes(1)
  })

  it('does not show a stale category load error after a newer refresh succeeds empty', async () => {
    const initialRequest = createDeferred<Awaited<ReturnType<typeof getCategories>>>()
    getCategoriesMock
      .mockReturnValueOnce(initialRequest.promise)
      .mockResolvedValueOnce([])
    createCategoryMock.mockResolvedValueOnce({
      id: 12,
      name: 'React',
      description: '',
      createdAt: '2026-05-12T00:00:00.000Z',
    })

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await wrapper.get('input').setValue('React')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('当前还没有分类')

    initialRequest.reject(new Error('旧分类请求失败'))
    await flushPromises()

    expect(wrapper.text()).toContain('当前还没有分类')
    expect(wrapper.text()).not.toContain('获取分类列表失败')
    expect(wrapper.text()).not.toContain('旧分类请求失败')
  })

  it('keeps the tag error state visible while retrying and clears it after a successful retry', async () => {
    let resolveRetry: ((value: typeof tag[]) => void) | null = null

    getTagsMock
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

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    const retryButton = wrapper.get('.error-state__action')
    await retryButton.trigger('click')

    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(retryButton.text()).toBe('正在重试')

    resolveRetry?.([tag])
    await flushPromises()

    expect(wrapper.text()).toContain('Pinia')
    expect(wrapper.text()).not.toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).not.toContain('请检查网络或服务状态后重试')
  })

  it('clears stale tag recovery guidance before the next validation error', async () => {
    getTagsMock.mockResolvedValue([tag])
    createTagMock.mockRejectedValueOnce(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input').setValue('Vite')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')

    await wrapper.get('input').setValue('')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('标签名称不能为空')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('clears stale tag save errors when editing the form again', async () => {
    getTagsMock.mockResolvedValue([tag])
    createTagMock.mockRejectedValueOnce(new Error('标签名称已存在'))

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input').setValue('Pinia')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('标签名称已存在')

    await wrapper.get('input').setValue('Vite')
    await flushPromises()

    expect(wrapper.text()).not.toContain('标签名称已存在')
  })

  it('reports tag reload failure separately after a successful create', async () => {
    getTagsMock
      .mockResolvedValueOnce([tag])
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'timeout',
          message: '请求超时，请稍后重试',
          retryable: true,
          shouldReport: true,
        }),
      )
    createTagMock.mockResolvedValueOnce({
      id: 22,
      name: 'Vite',
      createdAt: '2026-05-12T00:00:00.000Z',
    })

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input').setValue('Vite')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(createTagMock).toHaveBeenCalledWith({ name: 'Vite' })
    expect(wrapper.text()).toContain('标签已保存，但列表刷新失败')
    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).not.toContain('标签保存失败')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('')
  })

  it('does not show a stale tag save reload error after a newer refresh succeeds', async () => {
    const staleSaveReload = createDeferred<Awaited<ReturnType<typeof getTags>>>()
    const refreshedTag = {
      id: 22,
      name: 'Vite',
      createdAt: '2026-05-12T00:00:00.000Z',
    }

    getTagsMock
      .mockResolvedValueOnce([tag])
      .mockReturnValueOnce(staleSaveReload.promise)
      .mockResolvedValueOnce([refreshedTag])
    createTagMock.mockResolvedValueOnce(refreshedTag)

    const pinia = createPinia()
    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [pinia],
      },
    })
    const tagsStore = useTagsStore(pinia)

    await flushPromises()
    await wrapper.get('input').setValue('Vite')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    await tagsStore.fetchAll(true)
    await flushPromises()

    staleSaveReload.reject(new Error('旧标签保存刷新失败'))
    await flushPromises()

    expect(wrapper.text()).toContain('Vite')
    expect(wrapper.text()).not.toContain('标签已保存，但列表刷新失败')
    expect(wrapper.text()).not.toContain('旧标签保存刷新失败')
  })

  it('reports tag reload failure separately after a successful delete', async () => {
    getTagsMock
      .mockResolvedValueOnce([tag])
      .mockRejectedValueOnce(new Error('标签列表刷新失败'))
    deleteTagMock.mockResolvedValueOnce(null)

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    expect(deleteTagMock).toHaveBeenCalledWith(tag.id)
    expect(wrapper.text()).toContain('标签已删除，但列表刷新失败')
    expect(wrapper.text()).toContain('标签列表刷新失败')
    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除')).toBe(false)
  })

  it('does not show a stale tag delete reload error after a newer refresh succeeds', async () => {
    const staleDeleteReload = createDeferred<Awaited<ReturnType<typeof getTags>>>()
    const refreshedTag = {
      id: 22,
      name: 'Vite',
      createdAt: '2026-05-12T00:00:00.000Z',
    }

    getTagsMock
      .mockResolvedValueOnce([tag])
      .mockReturnValueOnce(staleDeleteReload.promise)
      .mockResolvedValueOnce([refreshedTag])
    deleteTagMock.mockResolvedValueOnce(null)

    const pinia = createPinia()
    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [pinia],
      },
    })
    const tagsStore = useTagsStore(pinia)

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    await tagsStore.fetchAll(true)
    await flushPromises()

    staleDeleteReload.reject(new Error('旧标签删除刷新失败'))
    await flushPromises()

    expect(wrapper.text()).toContain('Vite')
    expect(wrapper.text()).not.toContain('标签已删除，但列表刷新失败')
    expect(wrapper.text()).not.toContain('旧标签删除刷新失败')
  })

  it('prevents duplicate tag deletes while the confirmation is submitting', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteTag>>>()
    getTagsMock
      .mockResolvedValueOnce([tag])
      .mockResolvedValueOnce([])
    deleteTagMock.mockReturnValue(deleteRequest.promise)

    const wrapper = mount(AdminTagsView, {
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

    expect(deleteTagMock).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('button').find((button) => button.text() === '处理中')?.attributes('disabled')).toBeDefined()

    deleteRequest.resolve(null)
    await flushPromises()
  })

  it('prevents duplicate tag saves while the first submission is still pending', async () => {
    const createRequest = createDeferred<Awaited<ReturnType<typeof createTag>>>()
    getTagsMock.mockResolvedValueOnce([tag])
    createTagMock.mockReturnValue(createRequest.promise)

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input').setValue('Vite')

    const submitButton = wrapper.get('button.taxonomy-view__primary')
    submitButton.element.click()
    submitButton.element.click()
    await flushPromises()

    expect(createTagMock).toHaveBeenCalledTimes(1)
  })

  it('does not show a stale tag load error after a newer refresh succeeds empty', async () => {
    const initialRequest = createDeferred<Awaited<ReturnType<typeof getTags>>>()
    getTagsMock
      .mockReturnValueOnce(initialRequest.promise)
      .mockResolvedValueOnce([])
    createTagMock.mockResolvedValueOnce({
      id: 22,
      name: 'Vite',
      createdAt: '2026-05-12T00:00:00.000Z',
    })

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await wrapper.get('input').setValue('Vite')
    await wrapper.get('button.taxonomy-view__primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('当前还没有标签')

    initialRequest.reject(new Error('旧标签请求失败'))
    await flushPromises()

    expect(wrapper.text()).toContain('当前还没有标签')
    expect(wrapper.text()).not.toContain('获取标签列表失败')
    expect(wrapper.text()).not.toContain('旧标签请求失败')
  })

  it('keeps the current user detail visible when a later detail request fails', async () => {
    getAdminUsersMock.mockResolvedValue({
      items: [user],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminUserDetailMock
      .mockResolvedValueOnce(user)
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'network',
          message: '网络连接失败，请检查网络或后端服务',
          retryable: true,
          shouldReport: true,
        }),
      )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/users')
    await router.isReady()

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Author Seven')
    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
  })

  it('reports user reload failure separately after a successful delete', async () => {
    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      })
      .mockRejectedValueOnce(new Error('用户列表刷新失败'))
    deleteAdminUserMock.mockResolvedValueOnce(null)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/users')
    await router.isReady()

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除用户')?.trigger('click')
    await flushPromises()

    expect(deleteAdminUserMock).toHaveBeenCalledWith(user.id)
    expect(wrapper.text()).toContain('用户已删除，但列表刷新失败')
    expect(wrapper.text()).toContain('用户列表刷新失败')
    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除用户')).toBe(false)
  })
})
