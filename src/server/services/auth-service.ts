import { createToken, getTokenExpiresAt, verifyToken } from '../auth.js'
import { isUniqueConstraintError } from '../db-errors.js'
import { readServerEnv } from '../env.js'
import { ApiError } from '../errors.js'
import { getBearerToken } from '../http.js'
import { hashPassword, verifyPassword } from '../password.js'
import * as userRepository from '../repositories/users.js'
import type { CurrentUser, LoginCredentials, RegisterPayload, UserProfileUpdatePayload, UserRole } from '../types.js'

export interface AuthTokenPayload {
  token: string
  expiresAt: string
}

export interface AuthRepository {
  createAuthor(input: {
    username: string
    email: string
    passwordHash: string
  }): Promise<userRepository.UserWithPassword | Omit<userRepository.UserWithPassword, 'passwordHash'>>
  findUserByAccount(account: string): Promise<userRepository.UserWithPassword | null>
  findUserById(id: number): Promise<ReturnType<typeof userRepository.findUserById> extends Promise<infer T> ? T : never>
  updateUserProfile(id: number, payload: UserProfileUpdatePayload): Promise<ReturnType<typeof userRepository.updateUserProfile> extends Promise<infer T> ? T : never>
}

const defaultAuthRepository: AuthRepository = userRepository

function toCurrentUser(profile: NonNullable<Awaited<ReturnType<typeof userRepository.findUserById>>>): CurrentUser {
  return {
    userId: profile.id,
    role: profile.role,
    username: profile.username,
    email: profile.email,
    nickname: profile.nickname,
    status: profile.status,
  }
}

async function buildTokenPayload(userId: number, role: UserRole): Promise<AuthTokenPayload> {
  const env = readServerEnv()

  return {
    token: await createToken({ userId, role }, env.jwtSecret, env.jwtExpiresInSeconds),
    expiresAt: getTokenExpiresAt(env.jwtExpiresInSeconds),
  }
}

export function createAuthService(repository: AuthRepository = defaultAuthRepository) {
  return {
    async registerAuthor(payload: RegisterPayload) {
      const existingUsers = await Promise.all([
        repository.findUserByAccount(payload.username),
        repository.findUserByAccount(payload.email),
      ])

      if (existingUsers.some(Boolean)) {
        throw new ApiError(409, '用户名或邮箱已被使用')
      }

      const passwordHash = await hashPassword(payload.password)
      let profile: Awaited<ReturnType<AuthRepository['createAuthor']>>

      try {
        profile = await repository.createAuthor({
          username: payload.username,
          email: payload.email,
          passwordHash,
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ApiError(409, '用户名或邮箱已被使用')
        }

        throw error
      }

      return buildTokenPayload(profile.id, 'author')
    },

    async login(payload: LoginCredentials, expectedRole: UserRole): Promise<AuthTokenPayload> {
      const user = await repository.findUserByAccount(payload.account)

      if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
        throw new ApiError(401, '账号或密码错误')
      }

      if (user.status !== 'enabled') {
        throw new ApiError(403, '账号已被禁用')
      }

      if (user.role !== expectedRole) {
        throw new ApiError(403, '没有访问权限')
      }

      return buildTokenPayload(user.id, user.role)
    },

    async getCurrentUserFromToken(token: string, expectedRole?: UserRole): Promise<CurrentUser> {
      const env = readServerEnv()
      const claims = await verifyToken(token, env.jwtSecret)

      if (expectedRole && claims.role !== expectedRole) {
        throw new ApiError(403, '没有访问权限')
      }

      const profile = await repository.findUserById(claims.userId)

      if (!profile) {
        throw new ApiError(401, '登录已过期，请重新登录')
      }

      if (profile.status !== 'enabled') {
        throw new ApiError(403, '账号已被禁用')
      }

      return toCurrentUser(profile)
    },

    async getCurrentUserFromRequest(
      request: Parameters<typeof getBearerToken>[0],
      expectedRole?: UserRole,
    ) {
      const token = getBearerToken(request)

      if (!token) {
        throw new ApiError(401, '登录已过期，请重新登录')
      }

      return this.getCurrentUserFromToken(token, expectedRole)
    },

    async getUserProfile(user: CurrentUser) {
      const profile = await repository.findUserById(user.userId)

      if (!profile) {
        throw new ApiError(404, '用户不存在')
      }

      return profile
    },

    async getAdminProfile(user: CurrentUser) {
      if (user.role !== 'admin') {
        throw new ApiError(403, '没有访问权限')
      }

      return {
        id: user.userId,
        username: user.username,
        nickname: user.nickname,
      }
    },

    async updateUserProfile(user: CurrentUser, payload: UserProfileUpdatePayload) {
      const profile = await repository.updateUserProfile(user.userId, payload)

      if (!profile) {
        throw new ApiError(404, '用户不存在')
      }

      return profile
    },

    logout() {
      return null
    },
  }
}

export const authService = createAuthService()
