import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/constants/theme'
import { useThemeStore } from '@/stores/theme'

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to the light theme', () => {
    const store = useThemeStore()

    expect(store.theme).toBe(DEFAULT_THEME)
    expect(store.theme).toBe('light')
  })

  it('restores the stored theme during initialization', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    const store = useThemeStore()

    store.initTheme()

    expect(store.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('toggles the theme and syncs the DOM root attribute and local storage', () => {
    const store = useThemeStore()

    store.initTheme()
    store.toggleTheme()

    expect(store.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('does not throw when storage access is restricted', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    const store = useThemeStore()

    expect(() => store.initTheme()).not.toThrow()
    expect(store.theme).toBe(DEFAULT_THEME)
    expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME)

    expect(() => store.toggleTheme()).not.toThrow()
    expect(store.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
