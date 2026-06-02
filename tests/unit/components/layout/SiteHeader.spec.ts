import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import SiteHeader from '@/components/layout/SiteHeader.vue'
import { createAppRouter } from '@/router'

describe('SiteHeader', () => {
  it('preserves active article filters when submitting a header search', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push({
      path: '/',
      query: {
        page: '4',
        pageSize: '50',
        categoryIds: '1,2',
        tagIds: '8',
        sortField: 'publishTime',
        sortOrder: 'desc',
      },
    })
    await router.isReady()

    const wrapper = mount(SiteHeader, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('#site-header-search').setValue('vue')
    await wrapper.get('[data-test="site-header-search"]').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({
      page: '1',
      pageSize: '50',
      keyword: 'vue',
      categoryIds: '1,2',
      tagIds: '8',
      sortField: 'publishTime',
      sortOrder: 'desc',
    })
  })

  it('returns to the base home route when clearing the only active header search keyword', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push({
      path: '/',
      query: {
        page: '3',
        pageSize: '20',
        keyword: 'vue',
      },
    })
    await router.isReady()

    const wrapper = mount(SiteHeader, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await wrapper.get('#site-header-search').setValue('')
    await wrapper.get('[data-test="site-header-search"]').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(router.currentRoute.value.query).toEqual({})
  })
})
