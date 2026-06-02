import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentUserProfile, updateCurrentUserProfile } from '@/api/profile'
import { HttpClientError } from '@/api/client'
import { useUserAuthStore } from '@/stores/userAuth'
import { getUserToken, setUserToken } from '@/utils/auth-storage'
import ProfileView from '@/views/profile/ProfileView.vue'

vi.mock('@/api/profile', () => ({
  getCurrentUserProfile: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
  updateCurrentUserProfile: vi.fn(),
}))

const updateCurrentUserProfileMock = vi.mocked(updateCurrentUserProfile)
const getCurrentUserProfileMock = vi.mocked(getCurrentUserProfile)

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

describe('ProfileView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    getCurrentUserProfileMock.mockReset()
    updateCurrentUserProfileMock.mockReset()
  })

  it('clears the saved feedback when the user edits the profile again', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const userAuthStore = useUserAuthStore()
    userAuthStore.profile = {
      id: 9,
      username: 'writer',
      email: 'writer@example.com',
      role: 'author',
      nickname: 'Writer',
      avatarUrl: '',
      bio: '',
    }
    updateCurrentUserProfileMock.mockResolvedValue({
      ...userAuthStore.profile,
      nickname: 'Saved Writer',
    })

    const wrapper = mount(ProfileView, {
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
    await wrapper.get('input[type="text"]').setValue('Saved Writer')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('个人资料已保存')

    await wrapper.get('input[type="text"]').setValue('Unsaved Writer')
    await flushPromises()

    expect(wrapper.text()).not.toContain('个人资料已保存')
  })

  it('prevents duplicate profile save submissions while the update is in progress', async () => {
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateCurrentUserProfile>>>()
    const pinia = createPinia()
    setActivePinia(pinia)

    const userAuthStore = useUserAuthStore()
    userAuthStore.profile = {
      id: 9,
      username: 'writer',
      email: 'writer@example.com',
      role: 'author',
      nickname: 'Writer',
      avatarUrl: '',
      bio: '',
    }
    updateCurrentUserProfileMock.mockReturnValue(updateRequest.promise)

    const wrapper = mount(ProfileView, {
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
    await wrapper.get('input[type="text"]').setValue('Saved Writer')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')

    expect(updateCurrentUserProfileMock).toHaveBeenCalledTimes(1)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    updateRequest.resolve({
      ...userAuthStore.profile,
      nickname: 'Saved Writer',
    })
    await flushPromises()
  })

  it('ignores a stale profile save success after the user session changes', async () => {
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateCurrentUserProfile>>>()
    const pinia = createPinia()
    setActivePinia(pinia)
    setUserToken('old-user-token')

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'old-user-token'
    userAuthStore.profile = {
      id: 9,
      username: 'old-writer',
      email: 'old-writer@example.com',
      role: 'author',
      status: 'enabled',
      nickname: 'Old Writer',
      avatarUrl: '',
      bio: '',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    }
    const nextProfile = {
      id: 10,
      username: 'new-writer',
      email: 'new-writer@example.com',
      role: 'author' as const,
      status: 'enabled' as const,
      nickname: 'New Writer',
      avatarUrl: '',
      bio: '',
      createdAt: '2026-05-13T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
    }
    updateCurrentUserProfileMock.mockReturnValue(updateRequest.promise)

    const wrapper = mount(ProfileView, {
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
    await wrapper.get('input[type="text"]').setValue('Saved Old Writer')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    userAuthStore.profile = nextProfile

    updateRequest.resolve({
      id: 9,
      username: 'old-writer',
      email: 'old-writer@example.com',
      role: 'author',
      status: 'enabled',
      nickname: 'Saved Old Writer',
      avatarUrl: '',
      bio: '',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
    })
    await flushPromises()

    expect(userAuthStore.token).toBe('new-user-token')
    expect(getUserToken()).toBe('new-user-token')
    expect(userAuthStore.profile).toEqual(nextProfile)
    expect(wrapper.text()).toContain('New Writer')
    expect(wrapper.text()).not.toContain('Saved Old Writer')
    expect(wrapper.text()).not.toContain('个人资料已保存')
  })

  it('ignores a stale profile save failure after the user session changes', async () => {
    const updateRequest = createDeferred<Awaited<ReturnType<typeof updateCurrentUserProfile>>>()
    const pinia = createPinia()
    setActivePinia(pinia)
    setUserToken('old-user-token')

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'old-user-token'
    userAuthStore.profile = {
      id: 9,
      username: 'old-writer',
      email: 'old-writer@example.com',
      role: 'author',
      status: 'enabled',
      nickname: 'Old Writer',
      avatarUrl: '',
      bio: '',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    }
    const nextProfile = {
      id: 10,
      username: 'new-writer',
      email: 'new-writer@example.com',
      role: 'author' as const,
      status: 'enabled' as const,
      nickname: 'New Writer',
      avatarUrl: '',
      bio: '',
      createdAt: '2026-05-13T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
    }
    updateCurrentUserProfileMock.mockReturnValue(updateRequest.promise)

    const wrapper = mount(ProfileView, {
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
    await wrapper.get('input[type="text"]').setValue('Saved Old Writer')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    setUserToken('new-user-token')
    userAuthStore.token = 'new-user-token'
    userAuthStore.profile = nextProfile

    updateRequest.reject(new Error('旧资料保存失败'))
    await flushPromises()

    expect(userAuthStore.token).toBe('new-user-token')
    expect(getUserToken()).toBe('new-user-token')
    expect(userAuthStore.profile).toEqual(nextProfile)
    expect(wrapper.text()).toContain('New Writer')
    expect(wrapper.text()).not.toContain('旧资料保存失败')
  })

  it('clears the local session when saving finds the account session expired', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    setUserToken('user-token')

    const userAuthStore = useUserAuthStore()
    userAuthStore.token = 'user-token'
    userAuthStore.profile = {
      id: 9,
      username: 'writer',
      email: 'writer@example.com',
      role: 'author',
      status: 'enabled',
      nickname: 'Writer',
      avatarUrl: '',
      bio: '',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    }
    updateCurrentUserProfileMock.mockRejectedValue(new HttpClientError({
      code: 401,
      kind: 'http',
      message: '登录已过期，请重新登录',
      retryable: false,
      shouldReport: false,
      status: 401,
    }))

    const wrapper = mount(ProfileView, {
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
    await wrapper.get('input[type="text"]').setValue('Saved Writer')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(userAuthStore.token).toBeNull()
    expect(userAuthStore.profile).toBeNull()
    expect(getUserToken()).toBeNull()
    expect(wrapper.text()).toContain('登录已过期，请重新登录')
  })

  it('disables the profile retry action while reloading after an initial load failure', async () => {
    const retryRequest = createDeferred<Awaited<ReturnType<typeof getCurrentUserProfile>>>()
    setUserToken('user-token')
    getCurrentUserProfileMock
      .mockRejectedValueOnce(new Error('个人资料加载失败'))
      .mockReturnValueOnce(retryRequest.promise)

    const wrapper = mount(ProfileView, {
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

    retryRequest.resolve({
      id: 9,
      username: 'writer',
      email: 'writer@example.com',
      role: 'author',
      status: 'enabled',
      nickname: 'Writer',
      avatarUrl: '',
      bio: 'Hello',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Writer')
    expect(wrapper.text()).not.toContain('个人资料加载失败')
  })
})
