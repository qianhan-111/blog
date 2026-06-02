import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import PublicLayout from '@/layouts/PublicLayout.vue'
import { createAppRouter } from '@/router'

describe('PublicLayout', () => {
  it('uses a viewport locked content area for auth screens', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(PublicLayout, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.find('.auth-card-shell').exists()).toBe(true)
  })

  it('wraps child pages with a transition boundary', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    await router.isReady()

    const wrapper = mount(PublicLayout, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.find('[data-test="route-transition"]').exists()).toBe(true)
  })
})
