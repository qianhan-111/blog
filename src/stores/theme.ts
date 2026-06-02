import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  DEFAULT_THEME,
  THEME_MODES,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '@/constants/theme'

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.includes(value as ThemeMode)
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
}

function readStoredTheme(): ThemeMode | null {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)

    return isThemeMode(storedTheme) ? storedTheme : null
  } catch {
    return null
  }
}

function persistTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore storage failures so theme updates still apply in restricted environments.
  }
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeMode>(DEFAULT_THEME)

  function setTheme(nextTheme: ThemeMode) {
    theme.value = nextTheme
    applyTheme(nextTheme)
    persistTheme(nextTheme)
  }

  function initTheme() {
    const storedTheme = readStoredTheme()

    if (storedTheme) {
      theme.value = storedTheme
      applyTheme(storedTheme)
      return
    }

    theme.value = DEFAULT_THEME
    applyTheme(DEFAULT_THEME)
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  return {
    theme,
    initTheme,
    setTheme,
    toggleTheme,
  }
})
