export type UserRole = 'author' | 'admin'

export type UserStatus = 'enabled' | 'disabled'

export interface UserProfile {
  id: number
  username: string
  email: string
  nickname: string
  avatarUrl: string
  bio: string
  role: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface AdminProfile {
  id: number
  username: string
  nickname: string
}

export interface PublicAuthorProfile {
  id: number
  username: string
  nickname: string
  avatarUrl: string
  bio: string
}

export interface UserProfileUpdatePayload {
  nickname?: string
  avatarUrl?: string
  bio?: string
}

export interface AdminUserListQuery {
  page: number
  pageSize: number
  keyword?: string
  status?: UserStatus
}
