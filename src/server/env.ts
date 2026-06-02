import { ApiError } from './errors.js'

const DEFAULT_JWT_EXPIRES_IN_SECONDS = 86400

export interface ServerEnv {
  databaseUrl: string
  jwtSecret: string
  jwtExpiresInSeconds: number
}

export function readServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const databaseUrl = env.DATABASE_URL?.trim() || ''
  const jwtSecret = env.JWT_SECRET?.trim() || ''
  const parsedJwtExpiresInSeconds = Number.parseInt(
    env.JWT_EXPIRES_IN_SECONDS ?? String(DEFAULT_JWT_EXPIRES_IN_SECONDS),
    10,
  )
  const jwtExpiresInSeconds =
    Number.isInteger(parsedJwtExpiresInSeconds) && parsedJwtExpiresInSeconds > 0
      ? parsedJwtExpiresInSeconds
      : DEFAULT_JWT_EXPIRES_IN_SECONDS

  if (!databaseUrl) {
    throw new ApiError(500, '后端数据库未配置')
  }

  if (jwtSecret.length < 32) {
    throw new ApiError(500, 'JWT 密钥未正确配置')
  }

  return {
    databaseUrl,
    jwtSecret,
    jwtExpiresInSeconds,
  }
}
