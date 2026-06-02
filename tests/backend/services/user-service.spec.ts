// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { createUserService, type UserRepository } from '../../../src/server/services/user-service'
import type { CurrentUser, PaginatedResponse, UserProfile } from '../../../src/server/types'

const admin: CurrentUser = {
  userId: 1,
  role: 'admin',
  username: 'admin',
  email: 'admin@example.com',
  nickname: 'Admin',
  status: 'enabled',
}

const adminProfile: UserProfile = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  nickname: 'Admin',
  avatarUrl: '',
  bio: '',
  role: 'admin',
  status: 'enabled',
  createdAt: '2026-05-17T00:00:00.000Z',
  updatedAt: '2026-05-17T00:00:00.000Z',
}

function createRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  const emptyPage: PaginatedResponse<UserProfile> = {
    items: [],
    meta: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    },
  }

  return {
    deleteUser: vi.fn(async () => true),
    findUserById: vi.fn(async () => adminProfile),
    listUsers: vi.fn(async () => emptyPage),
    updateUserStatus: vi.fn(async () => ({ ...adminProfile, status: 'disabled' })),
    userHasArticles: vi.fn(async () => false),
    ...overrides,
  }
}

describe('user service rules', () => {
  it('prevents admins from disabling their own account', async () => {
    const repository = createRepository()
    const service = createUserService(repository)

    await expect(service.updateUserStatus(admin, admin.userId, 'disabled')).rejects.toMatchObject({
      status: 409,
      message: '不能禁用当前管理员账号',
    })
    expect(repository.updateUserStatus).not.toHaveBeenCalled()
  })

  it('returns not found when deleting a missing user', async () => {
    const repository = createRepository({
      findUserById: vi.fn(async () => null),
    })
    const service = createUserService(repository)

    await expect(service.deleteUser(admin, 404)).rejects.toMatchObject({
      status: 404,
      message: '用户不存在',
    })
    expect(repository.userHasArticles).not.toHaveBeenCalled()
    expect(repository.deleteUser).not.toHaveBeenCalled()
  })

  it('returns not found when a user disappears during delete', async () => {
    const repository = createRepository({
      deleteUser: vi.fn(async () => false),
    })
    const service = createUserService(repository)

    await expect(service.deleteUser(admin, 7)).rejects.toMatchObject({
      status: 404,
      message: '用户不存在',
    })
  })

  it('maps user delete foreign key races to article conflicts', async () => {
    const repository = createRepository({
      userHasArticles: vi.fn(async () => false),
      deleteUser: vi.fn(async () => {
        throw Object.assign(new Error('update or delete on table violates foreign key constraint'), {
          code: '23503',
        })
      }),
    })
    const service = createUserService(repository)

    await expect(service.deleteUser(admin, 7)).rejects.toMatchObject({
      status: 409,
      message: '用户仍有关联文章，不能删除',
    })
  })
})
