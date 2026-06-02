import { createHttpClient } from '@/api/client'
import type { PaginatedResponse } from '@/types/api'
import type { AdminUserListQuery, UserProfile, UserStatus } from '@/types/user'

const adminClient = createHttpClient('admin')

export function getAdminUsers(params: AdminUserListQuery) {
  return adminClient.get<PaginatedResponse<UserProfile>>('/admin/users', { params })
}

export function getAdminUserDetail(id: number) {
  return adminClient.get<UserProfile>(`/admin/users/${id}`)
}

export function updateAdminUserStatus(id: number, status: UserStatus) {
  return adminClient.patch<UserProfile, { status: UserStatus }>(`/admin/users/${id}/status`, {
    status,
  })
}

export function deleteAdminUser(id: number) {
  return adminClient.delete<null>(`/admin/users/${id}`)
}
