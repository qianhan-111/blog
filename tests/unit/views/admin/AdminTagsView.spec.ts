import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpClientError } from '@/api/client'
import { createTag, deleteTag, getTags, updateTag } from '@/api/tags'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/utils/auth-storage'
import AdminTagsView from '@/views/admin/AdminTagsView.vue'

vi.mock('@/api/tags', () => ({
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  getTags: vi.fn(),
  updateTag: vi.fn(),
}))

const createTagMock = vi.mocked(createTag)
const deleteTagMock = vi.mocked(deleteTag)
const getTagsMock = vi.mocked(getTags)
const updateTagMock = vi.mocked(updateTag)

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

describe('AdminTagsView', () => {
  beforeEach(() => {
    clearAdminToken()
    createTagMock.mockReset()
    deleteTagMock.mockReset()
    getTagsMock.mockReset()
    updateTagMock.mockReset()

    getTagsMock.mockResolvedValue([])
  })

  it('clears the local admin session when saving a tag confirms session expiration', async () => {
    createTagMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [pinia],
      },
    })
    const adminAuthStore = seedAdminSession(pinia)

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Pinia')
    await wrapper.findAll('button').find((button) => button.text() === '创建标签')?.trigger('click')
    await flushPromises()

    expect(createTagMock).toHaveBeenCalledWith({
      name: 'Pinia',
    })
    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('ignores a stale tag save success after the admin session changes', async () => {
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createTag>>>()
    createTagMock.mockReturnValueOnce(saveRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Old Tag')
    await wrapper.findAll('button').find((button) => button.text() === '创建标签')?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    await wrapper.get('input[type="text"]').setValue('New Session Tag')

    saveRequest.resolve({
      id: 22,
      name: 'Old Tag',
      createdAt: '2026-05-12T00:00:00.000Z',
    })
    await flushPromises()

    expect(getAdminToken()).toBe('new-admin-token')
    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('New Session Tag')
    expect(getTagsMock).toHaveBeenCalledTimes(1)
  })

  it('keeps a newer tag edit form after an older create response resolves', async () => {
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createTag>>>()
    getTagsMock
      .mockResolvedValueOnce([{
        id: 21,
        name: 'Pinia',
        createdAt: '2026-05-12T00:00:00.000Z',
      }])
      .mockResolvedValueOnce([
        {
          id: 21,
          name: 'Pinia',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
        {
          id: 22,
          name: 'Old Tag',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      ])
    createTagMock.mockReturnValueOnce(saveRequest.promise)

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Old Tag')
    wrapper.findAll('button').find((button) => button.text() === '创建标签')?.element.click()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await flushPromises()

    saveRequest.resolve({
      id: 22,
      name: 'Old Tag',
      createdAt: '2026-05-12T00:00:00.000Z',
    })
    await flushPromises()

    expect(wrapper.text()).toContain('编辑标签')
    expect(wrapper.text()).toContain('Old Tag')
    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('Pinia')
    expect(getTagsMock).toHaveBeenCalledTimes(2)
  })

  it('does not show an older tag save error after switching forms', async () => {
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createTag>>>()
    getTagsMock.mockResolvedValue([{
      id: 21,
      name: 'Pinia',
      createdAt: '2026-05-12T00:00:00.000Z',
    }])
    createTagMock.mockReturnValueOnce(saveRequest.promise)

    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Old Tag')
    wrapper.findAll('button').find((button) => button.text() === '创建标签')?.element.click()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await flushPromises()

    saveRequest.reject(new Error('旧标签保存失败'))
    await flushPromises()

    expect(wrapper.text()).toContain('编辑标签')
    expect(wrapper.text()).not.toContain('旧标签保存失败')
    expect(wrapper.text()).not.toContain('标签保存失败')
    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('Pinia')
  })

  it('ignores a stale tag save failure after the admin session changes', async () => {
    const saveRequest = createDeferred<Awaited<ReturnType<typeof createTag>>>()
    createTagMock.mockReturnValueOnce(saveRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper.get('input[type="text"]').setValue('Old Tag')
    await wrapper.findAll('button').find((button) => button.text() === '创建标签')?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'

    saveRequest.reject(new Error('旧标签保存失败'))
    await flushPromises()

    expect(getAdminToken()).toBe('new-admin-token')
    expect(wrapper.text()).not.toContain('旧标签保存失败')
  })

  it('clears the local admin session when updating a tag confirms session expiration', async () => {
    getTagsMock.mockResolvedValue([{
      id: 21,
      name: 'Pinia',
      createdAt: '2026-05-12T00:00:00.000Z',
    }])
    updateTagMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const wrapper = mount(AdminTagsView, {
      global: {
        plugins: [pinia],
      },
    })
    const adminAuthStore = seedAdminSession(pinia)

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '编辑')?.trigger('click')
    await wrapper.get('input[type="text"]').setValue('Pinia Store')
    await wrapper.findAll('button').find((button) => button.text() === '保存标签')?.trigger('click')
    await flushPromises()

    expect(updateTagMock).toHaveBeenCalledWith(21, {
      name: 'Pinia Store',
    })
    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('clears the local admin session when deleting a tag confirms session expiration', async () => {
    getTagsMock.mockResolvedValue([{
      id: 21,
      name: 'Pinia',
      createdAt: '2026-05-12T00:00:00.000Z',
    }])
    deleteTagMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const wrapper = mount(AdminTagsView, {
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

    expect(deleteTagMock).toHaveBeenCalledWith(21)
    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('keeps the delete confirmation open after a delete response started with an older admin token', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteTag>>>()
    getTagsMock.mockResolvedValue([{
      id: 21,
      name: 'Pinia',
      createdAt: '2026-05-12T00:00:00.000Z',
    }])
    deleteTagMock.mockReturnValueOnce(deleteRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminTagsView, {
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
    expect(wrapper.text()).not.toContain('标签删除失败')
  })
})
