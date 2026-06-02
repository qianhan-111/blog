import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  getCurrentUserProfile,
  loginUser,
  logoutUser,
  registerUser,
} from '@/api/profile'
import type { LoginCredentials, RegisterPayload } from '@/types/auth'
import type { UserProfile } from '@/types/user'
import { clearUserToken, getUserToken, setUserToken } from '@/utils/auth-storage'
import { normalizeErrorMessage } from '@/utils/error-message'

function isConfirmedSessionFailure(caughtError: unknown) {
  if (typeof caughtError === 'object' && caughtError !== null) {
    const structuredError = caughtError as {
      code?: unknown
      staleAuthFailure?: unknown
      status?: unknown
    }

    if (structuredError.staleAuthFailure === true) {
      return false
    }

    if (structuredError.code === 401 || structuredError.status === 401) {
      return true
    }

    if (structuredError.code === 403 || structuredError.status === 403) {
      const message = normalizeErrorMessage(caughtError, '')
      return /账号.*禁用/.test(message)
    }
  }

  const message = normalizeErrorMessage(caughtError, '')
  return /登录.*失效|会话.*失效|登录.*过期|会话.*过期/.test(message)
}

export const useUserAuthStore = defineStore('userAuth', () => {
  const token = ref<string | null>(getUserToken())
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let latestAuthRequestId = 0
  let pendingAuthRequestId: number | null = null
  let latestHydrateRequestId = 0

  function clearSession() {
    clearUserToken()
    token.value = null
    profile.value = null
  }

  function clearSessionIfConfirmedFailure(caughtError: unknown) {
    if (!isConfirmedSessionFailure(caughtError)) {
      return false
    }

    clearSession()
    return true
  }

  function isCurrentProfileRequest(requestToken: string) {
    return token.value === requestToken && getUserToken() === requestToken
  }

  function isLatestAuthRequest(requestId: number) {
    return requestId === latestAuthRequestId
  }

  function beginAuthRequest() {
    const requestId = ++latestAuthRequestId
    pendingAuthRequestId = requestId
    return requestId
  }

  function isCurrentHydrateRequest(
    requestId: number,
    authRequestId: number,
    requestToken: string,
    startedDuringAuthRequest: boolean,
  ) {
    return (
      !startedDuringAuthRequest &&
      pendingAuthRequestId === null &&
      requestId === latestHydrateRequestId &&
      authRequestId === latestAuthRequestId &&
      isCurrentProfileRequest(requestToken)
    )
  }

  function invalidateAuthRequests() {
    latestAuthRequestId += 1
    pendingAuthRequestId = null
  }

  async function fetchProfile() {
    const requestToken = token.value

    if (!requestToken) {
      profile.value = null
      return null
    }

    let nextProfile: UserProfile

    try {
      nextProfile = await getCurrentUserProfile()
    } catch (caughtError) {
      if (!isCurrentProfileRequest(requestToken)) {
        return profile.value
      }

      throw caughtError
    }

    if (!isCurrentProfileRequest(requestToken)) {
      return profile.value
    }

    profile.value = nextProfile
    return nextProfile
  }

  async function login(payload: LoginCredentials) {
    const requestId = beginAuthRequest()
    loading.value = true
    error.value = null

    try {
      const response = await loginUser(payload)
      if (!isLatestAuthRequest(requestId)) {
        return profile.value
      }

      token.value = response.token
      setUserToken(response.token)
      await fetchProfile()
      if (!isLatestAuthRequest(requestId)) {
        return profile.value
      }

      return profile.value
    } catch (caughtError) {
      if (!isLatestAuthRequest(requestId)) {
        return profile.value
      }

      clearSessionIfConfirmedFailure(caughtError)
      error.value = normalizeErrorMessage(caughtError, '用户认证失败')
      throw caughtError
    } finally {
      if (isLatestAuthRequest(requestId)) {
        pendingAuthRequestId = null
        loading.value = false
      }
    }
  }

  async function register(payload: RegisterPayload) {
    const requestId = beginAuthRequest()
    loading.value = true
    error.value = null

    try {
      const response = await registerUser(payload)
      if (!isLatestAuthRequest(requestId)) {
        return profile.value
      }

      token.value = response.token
      setUserToken(response.token)
      await fetchProfile()
      if (!isLatestAuthRequest(requestId)) {
        return profile.value
      }

      return profile.value
    } catch (caughtError) {
      if (!isLatestAuthRequest(requestId)) {
        return profile.value
      }

      clearSessionIfConfirmedFailure(caughtError)
      error.value = normalizeErrorMessage(caughtError, '用户认证失败')
      throw caughtError
    } finally {
      if (isLatestAuthRequest(requestId)) {
        pendingAuthRequestId = null
        loading.value = false
      }
    }
  }

  async function logout() {
    invalidateAuthRequests()
    loading.value = true
    error.value = null

    try {
      if (token.value) {
        await logoutUser()
      }
    } finally {
      clearSession()
      loading.value = false
    }
  }

  async function hydrate() {
    const requestId = ++latestHydrateRequestId
    const authRequestId = latestAuthRequestId
    const startedDuringAuthRequest = pendingAuthRequestId !== null
    token.value = getUserToken()
    const requestToken = token.value
    let clearedCurrentSession = false

    if (!requestToken) {
      profile.value = null
      return null
    }

    loading.value = true
    error.value = null

    try {
      const nextProfile = await getCurrentUserProfile()
      if (!isCurrentHydrateRequest(requestId, authRequestId, requestToken, startedDuringAuthRequest)) {
        return profile.value
      }

      profile.value = nextProfile
      return nextProfile
    } catch (caughtError) {
      if (!isCurrentHydrateRequest(requestId, authRequestId, requestToken, startedDuringAuthRequest)) {
        return profile.value
      }

      clearSessionIfConfirmedFailure(caughtError)
      clearedCurrentSession = !isCurrentProfileRequest(requestToken)
      profile.value = null
      error.value = normalizeErrorMessage(caughtError, '用户认证失败')
      return null
    } finally {
      if (
        isCurrentHydrateRequest(requestId, authRequestId, requestToken, startedDuringAuthRequest) ||
        (
          clearedCurrentSession &&
          !startedDuringAuthRequest &&
          pendingAuthRequestId === null &&
          requestId === latestHydrateRequestId &&
          authRequestId === latestAuthRequestId
        )
      ) {
        loading.value = false
      }
    }
  }

  return {
    token,
    profile,
    loading,
    error,
    clearSessionIfConfirmedFailure,
    fetchProfile,
    hydrate,
    login,
    logout,
    register,
  }
})
