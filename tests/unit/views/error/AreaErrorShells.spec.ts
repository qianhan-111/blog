import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import App from '@/App.vue'
import { createAppRouter } from '@/router'
import {
  clearAdminToken,
  clearUserToken,
  setAdminToken,
  setUserToken,
} from '@/utils/auth-storage'

describe('area-scoped error shells', () => {
  beforeEach(() => {
    clearUserToken()
    clearAdminToken()
  })

  it('shows admin-specific forbidden guidance when an author session visits the admin area', async () => {
    setUserToken('user-token')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/admin')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(router.currentRoute.value.path).toBe('/403')
    expect(wrapper.text()).toContain('前往管理员登录')
  })

  it('renders unknown admin routes inside the admin shell', async () => {
    setAdminToken('admin-token')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/admin/missing')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.text()).toContain('控制台')
    expect(wrapper.text()).toContain('返回管理员首页')
  })

  it('renders unknown writer routes inside the writer shell', async () => {
    setUserToken('user-token')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/writer/missing')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.text()).toContain('作者区')
    expect(wrapper.text()).toContain('返回作者后台')
  })
})
