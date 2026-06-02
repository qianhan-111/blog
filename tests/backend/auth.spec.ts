// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SignJWT } from 'jose'

import { createToken, verifyToken } from '../../src/server/auth'

describe('backend JWT helpers', () => {
  const secret = 'x'.repeat(32)

  it('creates and verifies author tokens', async () => {
    const token = await createToken({ userId: 7, role: 'author' }, secret, 3600)
    await expect(verifyToken(token, secret)).resolves.toMatchObject({
      userId: 7,
      role: 'author',
    })
  })

  it('rejects invalid tokens', async () => {
    await expect(verifyToken('bad-token', secret)).rejects.toThrow('登录已过期，请重新登录')
  })

  it('rejects signed tokens with non-strict numeric user id subjects', async () => {
    const token = await new SignJWT({
      role: 'author',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('7abc')
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(new TextEncoder().encode(secret))

    await expect(verifyToken(token, secret)).rejects.toThrow('登录已过期，请重新登录')
  })
})
