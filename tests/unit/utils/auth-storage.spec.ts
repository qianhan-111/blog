import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAdminToken,
  clearUserToken,
  getAdminToken,
  getUserToken,
  setAdminToken,
  setUserToken,
} from '@/utils/auth-storage'

describe('auth storage utilities', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores user and admin tokens independently in session storage', () => {
    setUserToken('user-token')
    setAdminToken('admin-token')

    expect(getUserToken()).toBe('user-token')
    expect(getAdminToken()).toBe('admin-token')
    expect(sessionStorage.getItem('blog.user.token')).toBe('user-token')
    expect(sessionStorage.getItem('blog.admin.token')).toBe('admin-token')
    expect(localStorage.getItem('blog.user.token')).toBeNull()
    expect(localStorage.getItem('blog.admin.token')).toBeNull()
  })

  it('reads legacy tokens from local storage and migrates them into session storage', () => {
    localStorage.setItem('blog.user.token', 'legacy-user-token')
    localStorage.setItem('blog.admin.token', 'legacy-admin-token')

    expect(getUserToken()).toBe('legacy-user-token')
    expect(getAdminToken()).toBe('legacy-admin-token')
    expect(sessionStorage.getItem('blog.user.token')).toBe('legacy-user-token')
    expect(sessionStorage.getItem('blog.admin.token')).toBe('legacy-admin-token')
    expect(localStorage.getItem('blog.user.token')).toBeNull()
    expect(localStorage.getItem('blog.admin.token')).toBeNull()
  })

  it('keeps legacy tokens when session storage migration fails', () => {
    const originalSetItem = Storage.prototype.setItem

    localStorage.setItem('blog.user.token', 'legacy-user-token')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(storageKey, token) {
      if (this === sessionStorage) {
        throw new Error('session storage disabled')
      }

      return originalSetItem.call(this, storageKey, token)
    })

    expect(getUserToken()).toBe('legacy-user-token')
    expect(sessionStorage.getItem('blog.user.token')).toBeNull()
    expect(localStorage.getItem('blog.user.token')).toBe('legacy-user-token')
  })

  it('clears one token without touching the other across both storages', () => {
    setUserToken('user-token')
    setAdminToken('admin-token')

    clearUserToken()
    expect(getUserToken()).toBeNull()
    expect(getAdminToken()).toBe('admin-token')
    expect(sessionStorage.getItem('blog.user.token')).toBeNull()
    expect(localStorage.getItem('blog.user.token')).toBeNull()

    setUserToken('user-token')
    clearAdminToken()
    expect(getUserToken()).toBe('user-token')
    expect(getAdminToken()).toBeNull()
    expect(sessionStorage.getItem('blog.admin.token')).toBeNull()
    expect(localStorage.getItem('blog.admin.token')).toBeNull()
  })

  it('returns null safely when storage is empty', () => {
    expect(getUserToken()).toBeNull()
    expect(getAdminToken()).toBeNull()
  })
})
