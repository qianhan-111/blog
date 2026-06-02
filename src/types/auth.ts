export type AuthRole = 'guest' | 'author' | 'admin'

export interface AuthTokenPayload {
  token: string
  expiresAt?: string
}

export interface LoginCredentials {
  account: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  confirmPassword: string
}
