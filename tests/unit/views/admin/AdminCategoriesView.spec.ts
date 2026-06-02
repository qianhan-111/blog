import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCategory, deleteCategory, getCategories, updateCategory } from '@/api/categories'
import { HttpClientError } from '@/api/client'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/utils/auth-storage'
import AdminCategoriesView from '@/views/admin/AdminCategoriesView.vue'

vi.mock('@/api/categories', () => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getCategories: vi.fn(),
  updateCategory: vi.fn(),
}))

const createCategoryMock = vi.mocked(createCategory)
const deleteCategoryMock = vi.mocked(deleteCategory)
const getCategoriesMock = vi.mocked(getCategories)
const updateCategoryMock = vi.mocked(updateCategory)

function seedAdminSession(pinia: ReturnType<typeof createPinia>) {
  setAdminToken('admin-token')
  const adminAuthStore = useAdminAuthStore(pinia)
  adminAuthStore.token = 'admin-token'
  adminAuthStore.profile = {
    id: 1,
    username: 'admin',
    nickname: 'Admin',
  }

  return adminAuthStore
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

describe('AdminCategoriesView', () => {
  beforeEach(() => {
    clearAdminToken()
    createCategoryMock.mockReset()
    deleteCategoryMock.mockReset()
    getCategoriesMock.mockReset()
    updateCategoryMock.mockReset()

    getCategoriesMock.mockResolvedValue([])
  })

  it('clears the local admin session when saving a category confirms session expiration', async () => {
    createCategoryMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [pinia],
      },
    })
    const adminAuthStore = seedAdminSession(pinia)

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Vue')
    await wrapper.findAll('button').find((button) => button.text() === '创建分类')?.trigger('click')
    await flushPromises()

    expect(createCategoryMock).toHaveBeenCalledWith({
      name: 'Vue',
      description: '',
    })
    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('ignores a stale category save success after the admin session changes', async () => {
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createCategory>>>()
    createCategoryMock.mockReturnValueOnce(saveRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Old Category')
    await wrapper.findAll('button').find((button) => button.text() === '创建分类')?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    await wrapper.get('input[type="text"]').setValue('New Session Draft')

    saveRequest.resolve({
      id: 12,
      name: 'Old Category',
      description: '',
      createdAt: '2026-05-12T00:00:00.000Z',
    })
    await flushPromises()

    expect(getAdminToken()).toBe('new-admin-token')
    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('New Session Draft')
    expect(getCategoriesMock).toHaveBeenCalledTimes(1)
  })

  it('keeps a newer category edit form after an older create response resolves', async () => {
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createCategory>>>()
    getCategoriesMock
      .mockResolvedValueOnce([{
        id: 11,
        name: 'Vue',
        description: 'Vue articles',
        createdAt: '2026-05-12T00:00:00.000Z',
      }])
      .mockResolvedValueOnce([
        {
          id: 11,
          name: 'Vue',
          description: 'Vue articles',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
        {
          id: 12,
          name: 'Old Category',
          description: '',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      ])
    createCategoryMock.mockReturnValueOnce(saveRequest.promise)

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Old Category')
    wrapper.findAll('button').find((button) => button.text() === '创建分类')?.element.click()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await flushPromises()

    saveRequest.resolve({
      id: 12,
      name: 'Old Category',
      description: '',
      createdAt: '2026-05-12T00:00:00.000Z',
    })
    await flushPromises()

    expect(wrapper.text()).toContain('编辑分类')
    expect(wrapper.text()).toContain('Old Category')
    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('Vue')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Vue articles')
    expect(getCategoriesMock).toHaveBeenCalledTimes(2)
  })

  it('does not show an older category save error after switching forms', async () => {
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createCategory>>>()
    getCategoriesMock.mockResolvedValue([{
      id: 11,
      name: 'Vue',
      description: 'Vue articles',
      createdAt: '2026-05-12T00:00:00.000Z',
    }])
    createCategoryMock.mockReturnValueOnce(saveRequest.promise)

    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Old Category')
    wrapper.findAll('button').find((button) => button.text() === '创建分类')?.element.click()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await flushPromises()

    saveRequest.reject(new Error('旧分类保存失败'))
    await flushPromises()

    expect(wrapper.text()).toContain('编辑分类')
    expect(wrapper.text()).not.toContain('旧分类保存失败')
    expect(wrapper.text()).not.toContain('分类保存失败')
    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('Vue')
  })

  it('ignores a stale category save failure after the admin session changes', async () => {
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createCategory>>>()
    createCategoryMock.mockReturnValueOnce(saveRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Old Category')
    await wrapper.findAll('button').find((button) => button.text() === '创建分类')?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'

    saveRequest.reject(new Error('旧分类保存失败'))
    await flushPromises()

    expect(getAdminToken()).toBe('new-admin-token')
    expect(wrapper.text()).not.toContain('旧分类保存失败')
  })

  it('clears the local admin session when updating a category confirms session expiration', async () => {
    getCategoriesMock.mockResolvedValue([{
      id: 11,
      name: 'Vue',
      description: 'Vue articles',
      createdAt: '2026-05-12T00:00:00.000Z',
    }])
    updateCategoryMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [pinia],
      },
    })
    const adminAuthStore = seedAdminSession(pinia)

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await wrapper.get('input[type="text"]').setValue('Vue 3')
    await wrapper.findAll('button').find((button) => button.text() === '保存分类')?.trigger('click')
    await flushPromises()

    expect(updateCategoryMock).toHaveBeenCalledWith(11, {
      name: 'Vue 3',
      description: 'Vue articles',
    })
    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('clears the local admin session when deleting a category confirms session expiration', async () => {
    getCategoriesMock.mockResolvedValue([{
      id: 11,
      name: 'Vue',
      description: 'Vue articles',
      createdAt: '2026-05-12T00:00:00.000Z',
    }])
    deleteCategoryMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const wrapper = mount(AdminCategoriesView, {
      global: {
        plugins: [pinia],
      },
    })
    const adminAuthStore = seedAdminSession(pinia)

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除')?.trigger('click')
    await flushPromises()

    expect(deleteCategoryMock).toHaveBeenCalledWith(11)
    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('keeps the delete confirmation open after a delete response started with an older admin token', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteCategory>>>()
    getCategoriesMock.mockResolvedValue([{
      id: 11,
      name: 'Vue',
      description: 'Vue articles',
      createdAt: '2026-05-12T00:00:00.000Z',
    }])
    deleteCategoryMock.mockReturnValueOnce(deleteRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminCategoriesView, {
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

    expect(getAdminToken()).toBe('new-admin-token')
    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除')).toBe(true)
    expect(wrapper.text()).not.toContain('分类删除失败')
  })
})
