import { createHttpClient } from '@/api/client'
import type { AuthTokenPayload, LoginCredentials, RegisterPayload } from '@/types/auth'
import type { UserProfile, UserProfileUpdatePayload } from '@/types/user'

const publicClient = createHttpClient('public')
const userClient = createHttpClient('user')

export function registerUser(payload: RegisterPayload) {
  return publicClient.post<AuthTokenPayload, RegisterPayload>('/auth/register', payload)
}

export function loginUser(payload: LoginCredentials) {
  return publicClient.post<AuthTokenPayload, LoginCredentials>('/auth/login', payload)
}

export function getCurrentUserProfile() {
  return userClient.get<UserProfile>('/auth/profile')
}

export function updateCurrentUserProfile(payload: UserProfileUpdatePayload) {
  return userClient.put<UserProfile, UserProfileUpdatePayload>('/auth/profile', payload)
}

export function logoutUser() {
  return userClient.post<null>('/auth/logout')
}
