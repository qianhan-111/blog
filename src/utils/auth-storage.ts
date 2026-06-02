import { AUTH_STORAGE_KEYS } from '@/constants/auth'

export type AuthTokenMode = 'user' | 'admin'

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const primaryStorage: BrowserStorage = sessionStorage
const legacyStorage: BrowserStorage = localStorage

function readStorage(storage: BrowserStorage, storageKey: string): string | null {
  try {
    return storage.getItem(storageKey)
  } catch {
    return null
  }
}

function writeStorage(storage: BrowserStorage, storageKey: string, token: string): boolean {
  try {
    storage.setItem(storageKey, token)
    return true
  } catch {
    // Ignore storage write failures so auth actions can still surface API errors.
    return false
  }
}

function removeStorage(storage: BrowserStorage, storageKey: string): void {
  try {
    storage.removeItem(storageKey)
  } catch {
    // Ignore storage cleanup failures to avoid blocking logout flows.
  }
}

function getToken(storageKey: string): string | null {
  const currentToken = readStorage(primaryStorage, storageKey)

  if (currentToken) {
    return currentToken
  }

  const legacyToken = readStorage(legacyStorage, storageKey)

  if (!legacyToken) {
    return null
  }

  if (writeStorage(primaryStorage, storageKey, legacyToken)) {
    removeStorage(legacyStorage, storageKey)
  }

  return legacyToken
}

function setToken(storageKey: string, token: string): void {
  if (writeStorage(primaryStorage, storageKey, token)) {
    removeStorage(legacyStorage, storageKey)
  }
}

function clearToken(storageKey: string): void {
  removeStorage(primaryStorage, storageKey)
  removeStorage(legacyStorage, storageKey)
}

export function getUserToken(): string | null {
  return getToken(AUTH_STORAGE_KEYS.userToken)
}

export function setUserToken(token: string): void {
  setToken(AUTH_STORAGE_KEYS.userToken, token)
}

export function clearUserToken(): void {
  clearToken(AUTH_STORAGE_KEYS.userToken)
}

export function getAdminToken(): string | null {
  return getToken(AUTH_STORAGE_KEYS.adminToken)
}

export function setAdminToken(token: string): void {
  setToken(AUTH_STORAGE_KEYS.adminToken, token)
}

export function clearAdminToken(): void {
  clearToken(AUTH_STORAGE_KEYS.adminToken)
}

export function getAuthToken(mode: AuthTokenMode): string | null {
  return mode === 'admin' ? getAdminToken() : getUserToken()
}
