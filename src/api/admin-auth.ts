import { createHttpClient } from '@/api/client'
import type { LoginCredentials, AuthTokenPayload } from '@/types/auth'
import type { AdminProfile } from '@/types/user'

const publicClient = createHttpClient('public')
const adminClient = createHttpClient('admin')

export function loginAdmin(payload: LoginCredentials) {
  return publicClient.post<AuthTokenPayload, LoginCredentials>('/admin/auth/login', payload)
}

export function getAdminProfile() {
  return adminClient.get<AdminProfile>('/admin/auth/profile')
}

export function logoutAdmin() {
  return adminClient.post<null>('/admin/auth/logout')
}
