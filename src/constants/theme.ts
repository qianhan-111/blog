export type ThemeMode = 'light' | 'dark'

export const THEME_MODES = ['light', 'dark'] as const satisfies readonly ThemeMode[]

export const DEFAULT_THEME: ThemeMode = 'light'

export const THEME_STORAGE_KEY = 'blog.theme.preference'
