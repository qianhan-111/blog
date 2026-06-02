import { ApiError } from './errors.js'

const DEFAULT_JWT_EXPIRES_IN_SECONDS = 86400

type ServerEnvSource = Record<string, string | undefined>
type RuntimeGlobal = typeof globalThis & {
  process?: {
    env?: ServerEnvSource
  }
}

export interface ServerEnv {
  databaseUrl: string
  jwtSecret: string
  jwtExpiresInSeconds: number
}

function getRuntimeEnv(): ServerEnvSource {
  return (globalThis as RuntimeGlobal).process?.env ?? {}
}

export function readServerEnv(env: ServerEnvSource = getRuntimeEnv()): ServerEnv {
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
