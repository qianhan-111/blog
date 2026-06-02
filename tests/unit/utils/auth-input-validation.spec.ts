import { describe, expect, it } from 'vitest'

import { getUnsafeAuthInputMessage } from '@/utils/auth-input-validation'

describe('auth input validation', () => {
  it('allows ordinary auth input', () => {
    expect(getUnsafeAuthInputMessage('writer@example.com', '邮箱')).toBe('')
    expect(getUnsafeAuthInputMessage('secure password 123', '密码')).toBe('')
  })

  it('blocks tag brackets tabs null bytes and null tokens', () => {
    expect(getUnsafeAuthInputMessage('<script>', '用户名')).toBe('用户名包含不安全字符')
    expect(getUnsafeAuthInputMessage('secret\tvalue', '密码')).toBe('密码包含不安全字符')
    expect(getUnsafeAuthInputMessage('abc\u0000def', '密码')).toBe('密码包含不安全字符')
    expect(getUnsafeAuthInputMessage('NULL', '用户名')).toBe('用户名包含不安全字符')
  })
})
