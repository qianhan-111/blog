import { jwtVerify, SignJWT } from 'jose'

import { ApiError } from './errors.js'
import type { AuthClaims, UserRole } from './types.js'

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

function parseStrictPositiveInteger(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const text = String(value)

  if (!/^\d+$/.test(text)) {
    return null
  }

  const parsed = Number(text)

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function getTokenExpiresAt(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString()
}

export async function createToken(
  claims: AuthClaims,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds

  return new SignJWT({
    role: claims.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(claims.userId))
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey(secret))
}

export async function verifyToken(token: string, secret: string): Promise<AuthClaims> {
  try {
    const result = await jwtVerify(token, getSecretKey(secret))
    const userId = parseStrictPositiveInteger(result.payload.sub)
    const role = result.payload.role

    if (userId === null || (role !== 'author' && role !== 'admin')) {
      throw new Error('invalid claims')
    }

    return {
      userId,
      role: role as UserRole,
    }
  } catch {
    throw new ApiError(401, '登录已过期，请重新登录')
  }
}
