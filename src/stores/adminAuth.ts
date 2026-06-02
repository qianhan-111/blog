import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getAdminProfile, loginAdmin, logoutAdmin } from '@/api/admin-auth'
import type { LoginCredentials } from '@/types/auth'
import type { AdminProfile } from '@/types/user'
import { clearAdminToken, getAdminToken, setAdminToken } from '@/utils/auth-storage'
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

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const token = ref<string | null>(getAdminToken())
  const profile = ref<AdminProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let latestAuthRequestId = 0
  let pendingAuthRequestId: number | null = null
  let latestHydrateRequestId = 0

  function clearSession() {
    clearAdminToken()
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
    return token.value === requestToken && getAdminToken() === requestToken
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

    let nextProfile: AdminProfile

    try {
      nextProfile = await getAdminProfile()
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
      const response = await loginAdmin(payload)
      if (!isLatestAuthRequest(requestId)) {
        return profile.value
      }

      token.value = response.token
      setAdminToken(response.token)
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
      error.value = normalizeErrorMessage(caughtError, '管理员认证失败')
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
        await logoutAdmin()
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
    token.value = getAdminToken()
    const requestToken = token.value
    let clearedCurrentSession = false

    if (!requestToken) {
      profile.value = null
      return null
    }

    loading.value = true
    error.value = null

    try {
      const nextProfile = await getAdminProfile()
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
      error.value = normalizeErrorMessage(caughtError, '管理员认证失败')
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
  }
})
