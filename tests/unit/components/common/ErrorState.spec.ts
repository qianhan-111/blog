import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ErrorState from '@/components/common/ErrorState.vue'

describe('ErrorState', () => {
  it('announces the error region accessibly and marks retry progress', () => {
    const wrapper = mount(ErrorState, {
      props: {
        message: '请求超时，请稍后重试',
        recoveryMessage: '可稍后重试，若持续失败请检查网络连接',
        retrying: true,
      },
      global: {
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    const section = wrapper.get('section.error-state')
    const retryButton = wrapper.get('button.error-state__action')

    expect(section.attributes('role')).toBe('alert')
    expect(section.attributes('aria-live')).toBe('assertive')
    expect(section.attributes('aria-busy')).toBe('true')
    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(retryButton.text()).toBe('正在重试')
  })
})
