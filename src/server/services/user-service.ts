import { isForeignKeyConstraintError } from '../db-errors.js'
import { ApiError } from '../errors.js'
import * as userRepository from '../repositories/users.js'
import type { AdminUserListQuery, CurrentUser, UserProfile, UserStatus } from '../types.js'

export interface UserRepository {
  deleteUser(id: number): Promise<boolean>
  findUserById(id: number): Promise<UserProfile | null>
  listUsers(query: AdminUserListQuery): ReturnType<typeof userRepository.listUsers>
  updateUserStatus(id: number, status: UserStatus): Promise<UserProfile | null>
  userHasArticles(id: number): Promise<boolean>
}

const defaultUserRepository: UserRepository = userRepository

function assertAdmin(user: CurrentUser): void {
  if (user.status !== 'enabled') {
    throw new ApiError(403, '账号已被禁用')
  }

  if (user.role !== 'admin') {
    throw new ApiError(403, '没有访问权限')
  }
}

async function mapArticleReferenceConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      throw new ApiError(409, '用户仍有关联文章，不能删除')
    }

    throw error
  }
}

export function createUserService(repository: UserRepository = defaultUserRepository) {
  return {
    listUsers(user: CurrentUser, query: AdminUserListQuery) {
      assertAdmin(user)
      return repository.listUsers(query)
    },

    async getUserDetail(user: CurrentUser, id: number) {
      assertAdmin(user)
      const profile = await repository.findUserById(id)

      if (!profile) {
        throw new ApiError(404, '用户不存在')
      }

      return profile
    },

    async updateUserStatus(user: CurrentUser, id: number, status: UserStatus) {
      assertAdmin(user)

      if (user.userId === id && status === 'disabled') {
        throw new ApiError(409, '不能禁用当前管理员账号')
      }

      const profile = await repository.updateUserStatus(id, status)

      if (!profile) {
        throw new ApiError(404, '用户不存在')
      }

      return profile
    },

    async deleteUser(user: CurrentUser, id: number) {
      assertAdmin(user)

      if (user.userId === id) {
        throw new ApiError(409, '不能删除当前管理员账号')
      }

      const profile = await repository.findUserById(id)

      if (!profile) {
        throw new ApiError(404, '用户不存在')
      }

      if (await repository.userHasArticles(id)) {
        throw new ApiError(409, '用户仍有关联文章，不能删除')
      }

      const deleted = await mapArticleReferenceConflict(() => repository.deleteUser(id))

      if (!deleted) {
        throw new ApiError(404, '用户不存在')
      }

      return null
    },
  }
}

export const userService = createUserService()
