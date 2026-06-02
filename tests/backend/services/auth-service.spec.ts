// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { createAuthService, type AuthRepository } from '../../../src/server/services/auth-service'
import type { UserProfile } from '../../../src/server/types'

const existingAuthor: UserProfile & { passwordHash: string } = {
  id: 7,
  username: 'author_demo',
  email: 'author@example.com',
  passwordHash: 'hashed-password',
  nickname: 'Author',
  avatarUrl: '',
  bio: '',
  role: 'author',
  status: 'enabled',
  createdAt: '2026-05-17T00:00:00.000Z',
  updatedAt: '2026-05-17T00:00:00.000Z',
}

function createRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    createAuthor: vi.fn(async () => existingAuthor),
    findUserByAccount: vi.fn(async () => null),
    findUserById: vi.fn(async () => existingAuthor),
    updateUserProfile: vi.fn(async () => existingAuthor),
    ...overrides,
  }
}

describe('auth service rules', () => {
  it('rejects duplicate usernames or emails before creating a new author', async () => {
    const repository = createRepository({
      findUserByAccount: vi.fn(async (account) => (
        account === 'author_demo' ? existingAuthor : null
      )),
    })
    const service = createAuthService(repository)

    await expect(service.registerAuthor({
      username: 'author_demo',
      email: 'new-author@example.com',
      password: 'Author123456!',
      confirmPassword: 'Author123456!',
    })).rejects.toMatchObject({
      status: 409,
      message: '用户名或邮箱已被使用',
    })
    expect(repository.createAuthor).not.toHaveBeenCalled()
  })

  it('maps database unique conflicts during registration to duplicate account errors', async () => {
    const repository = createRepository({
      createAuthor: vi.fn(async () => {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          code: '23505',
        })
      }),
    })
    const service = createAuthService(repository)

    await expect(service.registerAuthor({
      username: 'fresh_author',
      email: 'author@example.com',
      password: 'Author123456!',
      confirmPassword: 'Author123456!',
    })).rejects.toMatchObject({
      status: 409,
      message: '用户名或邮箱已被使用',
    })
  })
})
