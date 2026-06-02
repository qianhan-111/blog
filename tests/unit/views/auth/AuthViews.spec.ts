import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import { HttpClientError } from '@/api/client'
import { getAdminProfile, loginAdmin } from '@/api/admin-auth'
import { getCurrentUserProfile, loginUser, registerUser } from '@/api/profile'
import { createAppRouter } from '@/router'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { useUserAuthStore } from '@/stores/userAuth'
import { getAdminToken, getUserToken } from '@/utils/auth-storage'
import AdminLoginView from '@/views/admin/AdminLoginView.vue'
import LoginView from '@/views/auth/LoginView.vue'
import RegisterView from '@/views/auth/RegisterView.vue'

vi.mock('@/api/admin-auth', () => ({
  loginAdmin: vi.fn(),
  getAdminProfile: vi.fn(),
  logoutAdmin: vi.fn(),
}))

vi.mock('@/api/profile', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  updateCurrentUserProfile: vi.fn(),
  logoutUser: vi.fn(),
}))

const loginUserMock = vi.mocked(loginUser)
const registerUserMock = vi.mocked(registerUser)
const getCurrentUserProfileMock = vi.mocked(getCurrentUserProfile)
const loginAdminMock = vi.mocked(loginAdmin)
const getAdminProfileMock = vi.mocked(getAdminProfile)

const profile = {
  id: 9,
  username: 'writer',
  email: 'writer@example.com',
  nickname: 'Writer',
  avatarUrl: '/avatar.png',
  bio: 'Hello',
  role: 'author' as const,
  status: 'enabled' as const,
  createdAt: '2026-05-12T00:00:00.000Z',
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

describe('auth views', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    loginUserMock.mockReset()
    registerUserMock.mockReset()
    getCurrentUserProfileMock.mockReset()
    loginAdminMock.mockReset()
    getAdminProfileMock.mockReset()
  })

  it('redirects to /writer after a successful login', async () => {
    loginUserMock.mockResolvedValue({ token: 'user-token' })
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('input[type="text"]').setValue('writer')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    await router.isReady()
    await flushPromises()

    expect(loginUserMock).toHaveBeenCalledWith({
      account: 'writer',
      password: 'secret',
    })
    expect(getUserToken()).toBe('user-token')
    expect(sessionStorage.getItem('blog.user.token')).toBe('user-token')
    expect(localStorage.getItem('blog.user.token')).toBeNull()
    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/writer')
    })
  })

  it('redirects to the requested author path after a successful login', async () => {
    loginUserMock.mockResolvedValue({ token: 'user-token' })
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/login?redirect=/writer/articles/501/edit')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('input[type="text"]').setValue('writer')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    await router.isReady()
    await flushPromises()

    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/writer/articles/501/edit')
    })
  })

  it('preserves a safe login redirect when switching from login to registration', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/login?redirect=/writer/articles/501/edit')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    const registerLink = wrapper.findAll('a').find((link) => link.text() === '立即注册')

    expect(registerLink?.attributes('href')).toBe('/register?redirect=/writer/articles/501/edit')
  })

  it('ignores unsafe user login redirects outside the author area', async () => {
    loginUserMock.mockResolvedValue({ token: 'user-token' })
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/login?redirect=/admin/users')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('input[type="text"]').setValue('writer')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    await router.isReady()
    await flushPromises()

    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/writer')
    })
  })

  it('blocks suspicious login input and marks the affected field', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('input[type="text"]').setValue('<script>')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')

    expect(loginUserMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('用户名或邮箱包含不安全字符')
    expect(wrapper.get('input[type="text"]').classes()).toContain('is-invalid')
    expect(wrapper.find('a[href="/"]').text()).toBe('返回首页')
  })

  it('clears login field validation errors when the user edits that field', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const accountInput = wrapper.get('input[type="text"]')
    await wrapper.get('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('请输入用户名或邮箱')
    expect(wrapper.text()).toContain('请输入密码')

    await accountInput.setValue('writer')
    await flushPromises()

    expect(wrapper.text()).not.toContain('请输入用户名或邮箱')
    expect(wrapper.text()).toContain('请输入密码')
  })

  it('redirects to /writer after a successful registration', async () => {
    registerUserMock.mockResolvedValue({ token: 'registered-token' })
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('writer')
    await inputs[1].setValue('writer@example.com')
    await inputs[2].setValue('secret123')
    await inputs[3].setValue('secret123')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    await router.isReady()
    await flushPromises()

    expect(registerUserMock).toHaveBeenCalledWith({
      username: 'writer',
      email: 'writer@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    })
    expect(getUserToken()).toBe('registered-token')
    expect(sessionStorage.getItem('blog.user.token')).toBe('registered-token')
    expect(localStorage.getItem('blog.user.token')).toBeNull()
    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/writer')
    })
  })

  it('redirects to the requested author path after a successful registration', async () => {
    registerUserMock.mockResolvedValue({ token: 'registered-token' })
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/register?redirect=/writer/articles/new')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('writer')
    await inputs[1].setValue('writer@example.com')
    await inputs[2].setValue('secret123')
    await inputs[3].setValue('secret123')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    await router.isReady()
    await flushPromises()

    expect(registerUserMock).toHaveBeenCalledWith({
      username: 'writer',
      email: 'writer@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    })
    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/writer/articles/new')
    })
  })

  it('preserves a safe registration redirect when switching back to login', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/register?redirect=/writer/articles/new')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    const loginLink = wrapper.findAll('a').find((link) => link.text() === '返回登录')

    expect(loginLink?.attributes('href')).toBe('/login?redirect=/writer/articles/new')
  })

  it('ignores unsafe registration redirects outside the author area', async () => {
    registerUserMock.mockResolvedValue({ token: 'registered-token' })
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/register?redirect=/admin/users')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('writer')
    await inputs[1].setValue('writer@example.com')
    await inputs[2].setValue('secret123')
    await inputs[3].setValue('secret123')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    await router.isReady()
    await flushPromises()

    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/writer')
    })
  })

  it('blocks suspicious registration input and marks every affected field', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('writer')
    await inputs[1].setValue('writer@example.com')
    await inputs[2].setValue('secret\t123')
    await inputs[3].setValue('secret\t123')
    await wrapper.get('form').trigger('submit.prevent')

    expect(registerUserMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('密码包含不安全字符')
    expect(inputs[2].classes()).toContain('is-invalid')
    expect(inputs[3].classes()).toContain('is-invalid')
    expect(wrapper.find('a[href="/"]').text()).toBe('返回首页')
  })

  it('clears registration field validation errors when the user edits that field', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const inputs = wrapper.findAll('input')
    await wrapper.get('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('请输入用户名')
    expect(wrapper.text()).toContain('请输入有效邮箱')

    await inputs[0].setValue('writer')
    await flushPromises()

    expect(wrapper.text()).not.toContain('请输入用户名')
    expect(wrapper.text()).toContain('请输入有效邮箱')
  })

  it('shows timeout recovery guidance and preserves inputs after a failed login', async () => {
    loginUserMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const accountInput = wrapper.get('input[type="text"]')
    const passwordInput = wrapper.get('input[type="password"]')

    await accountInput.setValue('writer')
    await passwordInput.setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')
    expect(accountInput.element.value).toBe('writer')
    expect(passwordInput.element.value).toBe('secret')
  })

  it('prevents duplicate user login submissions while authentication is in progress', async () => {
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    loginUserMock.mockReturnValue(loginRequest.promise)
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('input[type="text"]').setValue('writer')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await wrapper.get('form').trigger('submit.prevent')

    expect(loginUserMock).toHaveBeenCalledTimes(1)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    loginRequest.resolve({ token: 'user-token' })
    await flushPromises()
  })

  it('does not redirect after an invalidated user login request resolves', async () => {
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginUser>>>()
    loginUserMock.mockReturnValueOnce(loginRequest.promise)
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    await router.isReady()

    const pinia = createPinia()
    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })
    const userAuthStore = useUserAuthStore(pinia)

    await wrapper.get('input[type="text"]').setValue('writer')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')

    await userAuthStore.logout()

    loginRequest.resolve({ token: 'user-token' })
    await flushPromises()
    await router.isReady()
    await flushPromises()

    expect(getUserToken()).toBeNull()
    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('clears stale login errors when the user edits credentials again', async () => {
    loginUserMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const accountInput = wrapper.get('input[type="text"]')
    await accountInput.setValue('writer')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')

    await accountInput.setValue('writer@example.com')
    await flushPromises()

    expect(wrapper.text()).not.toContain('请求超时，请稍后重试')
    expect(wrapper.text()).not.toContain('可稍后重试，若持续失败请检查网络连接')
  })

  it('clears stale registration errors when the user edits the form again', async () => {
    registerUserMock.mockRejectedValue(new Error('用户名已存在'))

    const router = createAppRouter(createMemoryHistory())
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('writer')
    await inputs[1].setValue('writer@example.com')
    await inputs[2].setValue('secret123')
    await inputs[3].setValue('secret123')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('用户名已存在')

    await inputs[0].setValue('another-writer')
    await flushPromises()

    expect(wrapper.text()).not.toContain('用户名已存在')
  })

  it('prevents duplicate registration submissions while registration is in progress', async () => {
    const registerRequest = createDeferred<Awaited<ReturnType<typeof registerUser>>>()
    registerUserMock.mockReturnValue(registerRequest.promise)
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('writer')
    await inputs[1].setValue('writer@example.com')
    await inputs[2].setValue('secret123')
    await inputs[3].setValue('secret123')
    await wrapper.get('form').trigger('submit.prevent')
    await wrapper.get('form').trigger('submit.prevent')

    expect(registerUserMock).toHaveBeenCalledTimes(1)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    registerRequest.resolve({ token: 'registered-token' })
    await flushPromises()
  })

  it('does not redirect after an invalidated registration request resolves', async () => {
    const registerRequest = createDeferred<Awaited<ReturnType<typeof registerUser>>>()
    registerUserMock.mockReturnValueOnce(registerRequest.promise)
    getCurrentUserProfileMock.mockResolvedValue(profile)

    const router = createAppRouter(createMemoryHistory())
    await router.push('/register')
    await router.isReady()

    const pinia = createPinia()
    const wrapper = mount(RegisterView, {
      global: {
        plugins: [pinia, router],
      },
    })
    const userAuthStore = useUserAuthStore(pinia)

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('writer')
    await inputs[1].setValue('writer@example.com')
    await inputs[2].setValue('secret123')
    await inputs[3].setValue('secret123')
    await wrapper.get('form').trigger('submit.prevent')

    await userAuthStore.logout()

    registerRequest.resolve({ token: 'registered-token' })
    await flushPromises()
    await router.isReady()
    await flushPromises()

    expect(getUserToken()).toBeNull()
    expect(router.currentRoute.value.fullPath).toBe('/register')
  })

  it('shows network retry guidance and re-enables admin submit button after failure', async () => {
    loginAdminMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/login')
    await router.isReady()

    const wrapper = mount(AdminLoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const accountInput = wrapper.get('input[type="text"]')
    const passwordInput = wrapper.get('input[type="password"]')
    const submitButton = wrapper.get('button[type="submit"]')

    await accountInput.setValue('admin')
    await passwordInput.setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
    expect(submitButton.attributes('disabled')).toBeUndefined()
    expect(accountInput.element.value).toBe('admin')
    expect(passwordInput.element.value).toBe('secret')
  })

  it('redirects to the requested admin path after a successful admin login', async () => {
    loginAdminMock.mockResolvedValue({ token: 'admin-token' })
    getAdminProfileMock.mockResolvedValue({
      id: 1,
      username: 'admin',
      nickname: 'Platform Admin',
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/login?redirect=/admin/users?page=2')
    await router.isReady()

    const wrapper = mount(AdminLoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('input[type="text"]').setValue('admin')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    await router.isReady()
    await flushPromises()

    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/admin/users?page=2')
    })
  })

  it('ignores unsafe admin login redirects outside the admin area', async () => {
    loginAdminMock.mockResolvedValue({ token: 'admin-token' })
    getAdminProfileMock.mockResolvedValue({
      id: 1,
      username: 'admin',
      nickname: 'Platform Admin',
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/login?redirect=/writer/articles')
    await router.isReady()

    const wrapper = mount(AdminLoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('input[type="text"]').setValue('admin')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    await router.isReady()
    await flushPromises()

    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/admin')
    })
  })

  it('prevents duplicate admin login submissions while authentication is in progress', async () => {
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    loginAdminMock.mockReturnValue(loginRequest.promise)
    getAdminProfileMock.mockResolvedValue({
      id: 1,
      username: 'admin',
      nickname: 'Platform Admin',
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/login')
    await router.isReady()

    const wrapper = mount(AdminLoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('input[type="text"]').setValue('admin')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await wrapper.get('form').trigger('submit.prevent')

    expect(loginAdminMock).toHaveBeenCalledTimes(1)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    loginRequest.resolve({ token: 'admin-token' })
    await flushPromises()
  })

  it('does not redirect after an invalidated admin login request resolves', async () => {
    const loginRequest = createDeferred<Awaited<ReturnType<typeof loginAdmin>>>()
    loginAdminMock.mockReturnValueOnce(loginRequest.promise)
    getAdminProfileMock.mockResolvedValue({
      id: 1,
      username: 'admin',
      nickname: 'Platform Admin',
    })

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/login')
    await router.isReady()

    const pinia = createPinia()
    const wrapper = mount(AdminLoginView, {
      global: {
        plugins: [pinia, router],
      },
    })
    const adminAuthStore = useAdminAuthStore(pinia)

    await wrapper.get('input[type="text"]').setValue('admin')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')

    await adminAuthStore.logout()

    loginRequest.resolve({ token: 'admin-token' })
    await flushPromises()
    await router.isReady()
    await flushPromises()

    expect(getAdminToken()).toBeNull()
    expect(router.currentRoute.value.fullPath).toBe('/admin/login')
  })

  it('clears admin login field validation errors when the user edits that field', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/login')
    await router.isReady()

    const wrapper = mount(AdminLoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const accountInput = wrapper.get('input[type="text"]')
    await wrapper.get('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('请输入管理员账号')
    expect(wrapper.text()).toContain('请输入密码')

    await accountInput.setValue('admin')
    await flushPromises()

    expect(wrapper.text()).not.toContain('请输入管理员账号')
    expect(wrapper.text()).toContain('请输入密码')
  })

  it('clears stale admin login errors when the user edits credentials again', async () => {
    loginAdminMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/login')
    await router.isReady()

    const wrapper = mount(AdminLoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const accountInput = wrapper.get('input[type="text"]')
    await accountInput.setValue('admin')
    await wrapper.get('input[type="password"]').setValue('secret')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')

    await accountInput.setValue('superadmin')
    await flushPromises()

    expect(wrapper.text()).not.toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).not.toContain('请检查网络或服务状态后重试')
  })
})
