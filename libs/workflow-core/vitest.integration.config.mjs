import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.integration.spec.ts', '**/__tests__/integration/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 60000, // 60s for integration tests
    hookTimeout: 60000,
  },
})
