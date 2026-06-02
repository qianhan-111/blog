import { fileURLToPath, URL } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'output/**'],
    setupFiles: ['./tests/setup.ts', './tests/backend/setup.ts'],
    passWithNoTests: true,
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: 'coverage/unit',
      reporter: ['text', 'html'],
    },
  },
})
