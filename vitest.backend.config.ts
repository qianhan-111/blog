import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/backend/**/*.spec.ts'],
    exclude: [...configDefaults.exclude, 'output/**'],
    setupFiles: ['./tests/backend/setup.ts'],
    passWithNoTests: true,
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: 'coverage/backend',
      reporter: ['text', 'html'],
    },
  },
})
