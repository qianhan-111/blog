import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteAdminUser,
  getAdminUserDetail,
  getAdminUsers,
  updateAdminUserStatus,
} from '@/api/users'
import { HttpClientError } from '@/api/client'
import { useAdminAuthStore } from '@/stores/adminAuth'
import type { UserProfile } from '@/types/user'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/utils/auth-storage'
import AdminUsersView from '@/views/admin/AdminUsersView.vue'

vi.mock('@/api/users', () => ({
  getAdminUsers: vi.fn(),
  getAdminUserDetail: vi.fn(),
  updateAdminUserStatus: vi.fn(),
  deleteAdminUser: vi.fn(),
}))

const getAdminUsersMock = vi.mocked(getAdminUsers)
const getAdminUserDetailMock = vi.mocked(getAdminUserDetail)
const updateAdminUserStatusMock = vi.mocked(updateAdminUserStatus)
const deleteAdminUserMock = vi.mocked(deleteAdminUser)

const user: UserProfile = {
  id: 7,
  username: 'author-7',
  email: 'author7@example.com',
  nickname: 'Author Seven',
  avatarUrl: '/avatar.png',
  bio: 'Bio',
  role: 'author',
  status: 'enabled',
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
}

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

describe('AdminUsersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getAdminUsersMock.mockReset()
    getAdminUserDetailMock.mockReset()
    updateAdminUserStatusMock.mockReset()
    deleteAdminUserMock.mockReset()
    clearAdminToken()

    getAdminUsersMock.mockResolvedValue({
      items: [user],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
  })

  it('clears the local admin session when the user list request confirms session expiration', async () => {
    getAdminUsersMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('clears the local admin session when the user detail request confirms session expiration', async () => {
    getAdminUsersMock.mockResolvedValue({
      items: [user],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminUserDetailMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('clears the local admin session when a status update confirms session expiration', async () => {
    getAdminUsersMock.mockResolvedValue({
      items: [user],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    updateAdminUserStatusMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '禁用')
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('clears the local admin session when deleting a user confirms session expiration', async () => {
    getAdminUsersMock.mockResolvedValue({
      items: [user],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    deleteAdminUserMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除用户')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('登录已过期，请重新登录')
    expect(adminAuthStore.token).toBeNull()
    expect(adminAuthStore.profile).toBeNull()
    expect(getAdminToken()).toBeNull()
  })

  it('retries the failed user detail request instead of refreshing the list', async () => {
    getAdminUserDetailMock
      .mockRejectedValueOnce(new Error('用户详情加载失败'))
      .mockResolvedValueOnce(user)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    await wrapper.get('.error-state__action').trigger('click')
    await flushPromises()

    expect(getAdminUserDetailMock).toHaveBeenCalledTimes(2)
    expect(getAdminUserDetailMock).toHaveBeenLastCalledWith(user.id)
    expect(getAdminUsersMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Author Seven')
    expect(wrapper.text()).toContain('author7@example.com')
    expect(wrapper.text()).not.toContain('用户详情加载失败')
  })

  it('ignores stale user detail responses after a newer detail request resolves', async () => {
    const secondUser = {
      ...user,
      id: 8,
      username: 'author-8',
      email: 'author8@example.com',
      nickname: 'Author Eight',
    }
    const olderRequest = createDeferred<Awaited<ReturnType<typeof getAdminUserDetail>>>()
    const newerRequest = createDeferred<Awaited<ReturnType<typeof getAdminUserDetail>>>()

    getAdminUsersMock.mockResolvedValue({
      items: [user, secondUser],
      meta: {
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      },
    })
    getAdminUserDetailMock
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    const viewButtons = wrapper.findAll('button').filter((button) => button.text() === '查看')
    await viewButtons[0].trigger('click')
    await viewButtons[1].trigger('click')
    await flushPromises()

    newerRequest.resolve(secondUser)
    await flushPromises()

    olderRequest.resolve(user)
    await flushPromises()

    const detailText = wrapper.get('.admin-users-view__detail').text()
    expect(detailText).toContain('Author Eight')
    expect(detailText).toContain('author8@example.com')
    expect(detailText).not.toContain('author7@example.com')
  })

  it('clears stale user detail when loading a different user fails', async () => {
    const secondUser = {
      ...user,
      id: 8,
      username: 'author-8',
      email: 'author8@example.com',
      nickname: 'Author Eight',
    }

    getAdminUsersMock.mockResolvedValue({
      items: [user, secondUser],
      meta: {
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      },
    })
    getAdminUserDetailMock
      .mockResolvedValueOnce(user)
      .mockRejectedValueOnce(new Error('第二个用户详情加载失败'))

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    const viewButtons = wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .filter((button) => button.text() === '查看')

    await viewButtons[0].trigger('click')
    await flushPromises()
    expect(wrapper.get('.admin-users-view__detail').text()).toContain('author7@example.com')

    await viewButtons[1].trigger('click')
    await flushPromises()

    const detailText = wrapper.get('.admin-users-view__detail').text()
    expect(detailText).toContain('第二个用户详情加载失败')
    expect(detailText).not.toContain('author7@example.com')
  })

  it('clears the selected user detail when refreshed results no longer contain it', async () => {
    const filteredUser = {
      ...user,
      id: 8,
      username: 'filtered-user',
      email: 'filtered@example.com',
      nickname: 'Filtered User',
    }

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
      .mockResolvedValueOnce({
        items: [filteredUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      })
    getAdminUserDetailMock.mockResolvedValue(user)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    expect(wrapper.get('.admin-users-view__detail').text()).toContain('author7@example.com')

    await wrapper.get('input[type="search"]').setValue('filtered')
    await wrapper.get('button.admin-users-view__action').trigger('click')
    await flushPromises()

    const detailText = wrapper.get('.admin-users-view__detail').text()
    expect(wrapper.text()).toContain('Filtered User')
    expect(detailText).toContain('请选择一个用户')
    expect(detailText).not.toContain('author7@example.com')
  })

  it('moves back a page after deleting the only user on the last page', async () => {
    const previousPageUser = {
      ...user,
      id: 6,
      username: 'author-6',
      email: 'author6@example.com',
      nickname: 'Author Six',
    }

    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [previousPageUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 2,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [previousPageUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 10,
          totalPages: 1,
        },
      })
    deleteAdminUserMock.mockResolvedValue(null)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除用户')?.trigger('click')
    await flushPromises()

    expect(deleteAdminUserMock).toHaveBeenCalledWith(user.id)
    expect(getAdminUsersMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('Author Six')
    expect(wrapper.text()).not.toContain('Author Seven')
  })

  it('prevents duplicate user deletes while the confirmation is submitting', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteAdminUser>>>()
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
      .mockResolvedValueOnce({
        items: [],
        meta: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0,
        },
      })
    deleteAdminUserMock.mockReturnValue(deleteRequest.promise)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()

    const confirmButton = wrapper.findAll('button').find((button) => button.text() === '确认删除用户')
    await confirmButton?.trigger('click')
    await confirmButton?.trigger('click')

    expect(deleteAdminUserMock).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('button').find((button) => button.text() === '处理中')?.attributes('disabled')).toBeDefined()

    deleteRequest.resolve(null)
    await flushPromises()
  })

  it('keeps the delete confirmation open after a delete response started with an older admin token', async () => {
    const deleteRequest = createDeferred<Awaited<ReturnType<typeof deleteAdminUser>>>()
    deleteAdminUserMock.mockReturnValueOnce(deleteRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除用户')?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    deleteRequest.resolve(null)
    await flushPromises()

    expect(wrapper.findAll('button').some((button) => button.text() === '确认删除用户')).toBe(true)
    expect(wrapper.text()).toContain('Author Seven')
    expect(wrapper.text()).not.toContain('删除用户失败')
  })

  it('prevents duplicate user status updates while the row action is submitting', async () => {
    const statusRequest = createDeferred<Awaited<ReturnType<typeof updateAdminUserStatus>>>()
    updateAdminUserStatusMock.mockReturnValue(statusRequest.promise)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    const statusButton = wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '禁用')
    await statusButton?.trigger('click')
    await statusButton?.trigger('click')

    expect(updateAdminUserStatusMock).toHaveBeenCalledTimes(1)
    expect(statusButton?.attributes('disabled')).toBeDefined()

    statusRequest.resolve({
      ...user,
      status: 'disabled',
    })
    await flushPromises()
  })

  it('ignores a status update response started with an older admin token', async () => {
    const statusRequest = createDeferred<Awaited<ReturnType<typeof updateAdminUserStatus>>>()
    updateAdminUserStatusMock.mockReturnValueOnce(statusRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '禁用')
      ?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    statusRequest.resolve({
      ...user,
      status: 'disabled',
    })
    await flushPromises()

    const panelText = wrapper.get('.admin-users-view__panel').text()
    expect(panelText).toContain('启用中')
    expect(panelText).not.toContain('已禁用')
    expect(wrapper.text()).not.toContain('更新用户状态失败')
  })

  it('does not clear a newer admin session after an older status update fails', async () => {
    const statusRequest = createDeferred<Awaited<ReturnType<typeof updateAdminUserStatus>>>()
    updateAdminUserStatusMock.mockReturnValueOnce(statusRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()
    await wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '禁用')
      ?.trigger('click')
    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'
    adminAuthStore.profile = {
      id: 2,
      username: 'new-admin',
      nickname: 'New Admin',
    }
    statusRequest.reject(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))
    await flushPromises()

    expect(adminAuthStore.token).toBe('new-admin-token')
    expect(adminAuthStore.profile?.username).toBe('new-admin')
    expect(getAdminToken()).toBe('new-admin-token')
    expect(wrapper.text()).not.toContain('登录已过期，请重新登录')
  })

  it('keeps each user row action disabled until its own status update finishes', async () => {
    const secondUser: UserProfile = {
      ...user,
      id: 8,
      username: 'author-8',
      email: 'author8@example.com',
      nickname: 'Author Eight',
    }
    const firstStatusRequest = createDeferred<Awaited<ReturnType<typeof updateAdminUserStatus>>>()
    const secondStatusRequest = createDeferred<Awaited<ReturnType<typeof updateAdminUserStatus>>>()

    getAdminUsersMock.mockResolvedValue({
      items: [user, secondUser],
      meta: {
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      },
    })
    updateAdminUserStatusMock
      .mockReturnValueOnce(firstStatusRequest.promise)
      .mockReturnValueOnce(secondStatusRequest.promise)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    const rows = wrapper
      .findAll('.admin-users-view__table-row')
      .filter((row) => row.text().includes('Author Seven') || row.text().includes('Author Eight'))
    const firstStatusButton = rows[0].findAll('button').find((button) => button.text() === '禁用')
    const secondStatusButton = rows[1].findAll('button').find((button) => button.text() === '禁用')

    await firstStatusButton?.trigger('click')
    await secondStatusButton?.trigger('click')

    expect(firstStatusButton?.attributes('disabled')).toBeDefined()
    expect(secondStatusButton?.attributes('disabled')).toBeDefined()

    firstStatusRequest.resolve({
      ...user,
      status: 'disabled',
    })
    await flushPromises()

    expect(secondStatusButton?.attributes('disabled')).toBeDefined()

    secondStatusRequest.resolve({
      ...secondUser,
      status: 'disabled',
    })
    await flushPromises()
  })

  it('removes users from the current list when a status update no longer matches active filters', async () => {
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
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      })
      .mockResolvedValueOnce({
        items: [],
        meta: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0,
        },
      })
    updateAdminUserStatusMock.mockResolvedValue({
      ...user,
      status: 'disabled',
    })

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('select').setValue('enabled')
    await wrapper.get('button.admin-users-view__action').trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '禁用')?.trigger('click')
    await flushPromises()

    expect(updateAdminUserStatusMock).toHaveBeenCalledWith(user.id, 'disabled')
    expect(getAdminUsersMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      status: 'enabled',
    })
    expect(wrapper.text()).toContain('当前没有匹配的用户')
    expect(wrapper.text()).not.toContain('Author Seven')
  })

  it('refreshes filtered users after a status update so the first page is backfilled', async () => {
    const secondUser = {
      ...user,
      id: 8,
      username: 'author-8',
      email: 'author8@example.com',
      nickname: 'Author Eight',
    }

    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [user, secondUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [user, secondUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [secondUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 10,
          totalPages: 1,
        },
      })
    updateAdminUserStatusMock.mockResolvedValueOnce({
      ...user,
      status: 'disabled',
    })

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('select').setValue('enabled')
    await wrapper.get('button.admin-users-view__action').trigger('click')
    await flushPromises()
    await wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '禁用')
      ?.trigger('click')
    await flushPromises()

    expect(updateAdminUserStatusMock).toHaveBeenCalledWith(user.id, 'disabled')
    expect(getAdminUsersMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      status: 'enabled',
    })
    expect(wrapper.text()).toContain('Author Eight')
    expect(wrapper.text()).not.toContain('Author Seven')
    expect(wrapper.findAll('.admin-users-view__page-button.is-active').map((button) => button.text())).toEqual([])
  })

  it('clears the selected user detail after a status update removes that user from filtered results', async () => {
    const secondUser = {
      ...user,
      id: 8,
      username: 'author-8',
      email: 'author8@example.com',
      nickname: 'Author Eight',
    }

    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 1,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 1,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [secondUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 10,
          totalPages: 1,
        },
      })
    getAdminUserDetailMock.mockResolvedValueOnce(user)
    updateAdminUserStatusMock.mockResolvedValueOnce({
      ...user,
      status: 'disabled',
    })

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('select').setValue('enabled')
    await wrapper.get('button.admin-users-view__action').trigger('click')
    await flushPromises()
    await wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '查看')
      ?.trigger('click')
    await flushPromises()
    expect(wrapper.get('.admin-users-view__detail').text()).toContain('author7@example.com')

    await wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '禁用')
      ?.trigger('click')
    await flushPromises()

    const detailText = wrapper.get('.admin-users-view__detail').text()
    expect(wrapper.text()).toContain('Author Eight')
    expect(detailText).toContain('请选择一个用户')
    expect(detailText).not.toContain('author7@example.com')
  })

  it('moves back a page after a status update removes the only user on the last filtered page', async () => {
    const previousPageUser = {
      ...user,
      id: 6,
      username: 'author-6',
      email: 'author6@example.com',
      nickname: 'Author Six',
    }

    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [previousPageUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 2,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [previousPageUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 10,
          totalPages: 1,
        },
      })
    updateAdminUserStatusMock.mockResolvedValueOnce({
      ...user,
      status: 'disabled',
    })

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('select').setValue('enabled')
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()
    await wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '禁用')
      ?.trigger('click')
    await flushPromises()

    expect(updateAdminUserStatusMock).toHaveBeenCalledWith(user.id, 'disabled')
    expect(getAdminUsersMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      status: 'enabled',
    })
    expect(wrapper.text()).toContain('Author Six')
    expect(wrapper.text()).not.toContain('Author Seven')
  })

  it('reports reload failure separately after a status update removes the only user on the last filtered page', async () => {
    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 2,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockRejectedValueOnce(new Error('状态更新后列表刷新失败'))
    updateAdminUserStatusMock.mockResolvedValueOnce({
      ...user,
      status: 'disabled',
    })

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('select').setValue('enabled')
    await wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '禁用')
      ?.trigger('click')
    await flushPromises()

    const activePages = wrapper.findAll('.admin-users-view__page-button.is-active').map((button) => button.text())

    expect(updateAdminUserStatusMock).toHaveBeenCalledWith(user.id, 'disabled')
    expect(getAdminUsersMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      status: 'enabled',
    })
    expect(wrapper.text()).toContain('用户状态已更新，但列表刷新失败')
    expect(wrapper.text()).toContain('状态更新后列表刷新失败')
    expect(activePages).toEqual(['2'])
  })

  it('clears stale user detail load errors after a successful status update', async () => {
    getAdminUserDetailMock
      .mockResolvedValueOnce(user)
      .mockRejectedValueOnce(new Error('用户详情刷新失败'))
    updateAdminUserStatusMock.mockResolvedValueOnce({
      ...user,
      status: 'disabled',
    })

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('用户详情刷新失败')

    await wrapper
      .get('.admin-users-view__panel')
      .findAll('button')
      .find((button) => button.text() === '禁用')
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.get('.admin-users-view__detail').text()).toContain('已禁用')
    expect(wrapper.text()).not.toContain('用户详情刷新失败')
  })

  it('keeps the previous page selected when loading the next page fails', async () => {
    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 1,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockRejectedValueOnce(new Error('用户列表加载失败'))

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()

    const activePages = wrapper.findAll('.admin-users-view__page-button.is-active').map((button) => button.text())

    expect(getAdminUsersMock).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('Author Seven')
    expect(wrapper.text()).toContain('用户列表加载失败')
    expect(activePages).toEqual(['1'])
  })

  it('ignores stale user list responses after a newer list request resolves', async () => {
    const staleUser = {
      ...user,
      id: 8,
      username: 'stale-page-user',
      email: 'stale@example.com',
      nickname: 'Stale Page User',
    }
    const filteredUser = {
      ...user,
      id: 9,
      username: 'filtered-user',
      email: 'filtered@example.com',
      nickname: 'Filtered User',
    }
    const olderRequest = createDeferred<Awaited<ReturnType<typeof getAdminUsers>>>()
    const newerRequest = createDeferred<Awaited<ReturnType<typeof getAdminUsers>>>()

    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 1,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newerRequest.promise)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await wrapper.get('input[type="search"]').setValue('filtered')
    await wrapper.get('button.admin-users-view__action').trigger('click')
    await flushPromises()

    newerRequest.resolve({
      items: [filteredUser],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    await flushPromises()

    olderRequest.resolve({
      items: [staleUser],
      meta: {
        page: 2,
        pageSize: 10,
        total: 11,
        totalPages: 2,
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Filtered User')
    expect(wrapper.text()).not.toContain('Stale Page User')
  })

  it('ignores a user list response started with an older admin token', async () => {
    const olderRequest = createDeferred<Awaited<ReturnType<typeof getAdminUsers>>>()

    getAdminUsersMock.mockReturnValueOnce(olderRequest.promise)

    const pinia = createPinia()
    const adminAuthStore = seedAdminSession(pinia)
    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    setAdminToken('new-admin-token')
    adminAuthStore.token = 'new-admin-token'

    olderRequest.resolve({
      items: [user],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    await flushPromises()

    expect(getAdminToken()).toBe('new-admin-token')
    expect(wrapper.text()).not.toContain('Author Seven')
    expect(wrapper.text()).toContain('当前没有匹配的用户')
  })

  it('keeps the current page selected when applying filters fails from a later page', async () => {
    const secondPageUser = {
      ...user,
      id: 8,
      username: 'author-8',
      email: 'author8@example.com',
      nickname: 'Author Eight',
    }

    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [user],
        meta: {
          page: 1,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        items: [secondPageUser],
        meta: {
          page: 2,
          pageSize: 10,
          total: 11,
          totalPages: 2,
        },
      })
      .mockRejectedValueOnce(new Error('筛选用户失败'))

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '下一页')?.trigger('click')
    await flushPromises()
    await wrapper.get('input[type="search"]').setValue('author')
    await wrapper.get('button.admin-users-view__action').trigger('click')
    await flushPromises()

    const activePages = wrapper.findAll('.admin-users-view__page-button.is-active').map((button) => button.text())

    expect(getAdminUsersMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      keyword: 'author',
    })
    expect(wrapper.text()).toContain('Author Eight')
    expect(wrapper.text()).toContain('筛选用户失败')
    expect(activePages).toEqual(['2'])
  })

  it('clears stale load errors after a successful delete reload leaves the list empty', async () => {
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
      .mockRejectedValueOnce(new Error('筛选用户失败'))
      .mockResolvedValueOnce({
        items: [],
        meta: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0,
        },
      })
    deleteAdminUserMock.mockResolvedValueOnce(null)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()
    await wrapper.get('button.admin-users-view__action').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('筛选用户失败')

    await wrapper.findAll('button').find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除用户')?.trigger('click')
    await flushPromises()

    expect(deleteAdminUserMock).toHaveBeenCalledWith(user.id)
    expect(wrapper.text()).toContain('当前没有匹配的用户')
    expect(wrapper.text()).not.toContain('筛选用户失败')
  })

  it('clears stale selected-user detail errors after deleting that user', async () => {
    const secondUser = {
      ...user,
      id: 8,
      username: 'author-8',
      email: 'author8@example.com',
      nickname: 'Author Eight',
    }

    getAdminUsersMock
      .mockResolvedValueOnce({
        items: [user, secondUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 2,
          totalPages: 1,
        },
      })
      .mockResolvedValueOnce({
        items: [secondUser],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      })
    getAdminUserDetailMock
      .mockResolvedValueOnce(user)
      .mockRejectedValueOnce(new Error('用户详情刷新失败'))
    deleteAdminUserMock.mockResolvedValueOnce(null)

    const wrapper = mount(AdminUsersView, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    const firstRowButtons = wrapper
      .findAll('.admin-users-view__table-row')
      .find((row) => row.text().includes('Author Seven'))
      ?.findAll('button')

    await firstRowButtons?.find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()
    await firstRowButtons?.find((button) => button.text() === '查看')?.trigger('click')
    await flushPromises()

    expect(wrapper.get('.admin-users-view__detail').text()).toContain('用户详情刷新失败')

    await firstRowButtons?.find((button) => button.text() === '删除')?.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '确认删除用户')?.trigger('click')
    await flushPromises()

    const detailText = wrapper.get('.admin-users-view__detail').text()
    expect(deleteAdminUserMock).toHaveBeenCalledWith(user.id)
    expect(wrapper.text()).toContain('Author Eight')
    expect(detailText).toContain('请选择一个用户')
    expect(detailText).not.toContain('用户详情刷新失败')
  })
})
