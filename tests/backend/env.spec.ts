// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { readServerEnv } from '../../src/server/env'

describe('readServerEnv', () => {
  it('reads required backend env values', () => {
    expect(readServerEnv({
      DATABASE_URL: 'postgresql://example',
      JWT_SECRET: 'x'.repeat(32),
      JWT_EXPIRES_IN_SECONDS: '3600',
    } as NodeJS.ProcessEnv)).toEqual({
      databaseUrl: 'postgresql://example',
      jwtSecret: 'x'.repeat(32),
      jwtExpiresInSeconds: 3600,
    })
  })

  it('rejects short JWT secrets', () => {
    expect(() => readServerEnv({
      DATABASE_URL: 'postgresql://example',
      JWT_SECRET: 'short',
    } as NodeJS.ProcessEnv)).toThrow('JWT 密钥未正确配置')
  })

  it('falls back to the default token lifetime for non-positive values', () => {
    expect(readServerEnv({
      DATABASE_URL: 'postgresql://example',
      JWT_SECRET: 'x'.repeat(32),
      JWT_EXPIRES_IN_SECONDS: '0',
    } as NodeJS.ProcessEnv).jwtExpiresInSeconds).toBe(86400)
  })
})
