import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ConfirmAction from '@/components/common/ConfirmAction.vue'

describe('ConfirmAction', () => {
  it('disables cancel and confirm actions while busy', async () => {
    const wrapper = mount(ConfirmAction, {
      props: {
        title: '删除当前项目',
        message: '确认删除后不可恢复',
        busy: true,
      },
    })

    await wrapper.get('.confirm-action__backdrop').trigger('click')
    await wrapper.get('.confirm-action__ghost').trigger('click')
    await wrapper.get('.confirm-action__danger').trigger('click')

    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.get('.confirm-action__ghost').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.confirm-action__danger').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.confirm-action__danger').text()).toBe('处理中')
  })
})
