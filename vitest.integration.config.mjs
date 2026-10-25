import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    include: ['**/*.integration.spec.ts', '**/*.integration.test.ts', '**/__tests__/integration/**/*.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/apps/e2e/**'],
    // Run tests sequentially in a single worker to allow sharing global test database
    pool: 'forks',
    singleFork: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/index.ts',
        '**/*.config.ts',
        '**/*.config.mjs',
        '**/*.d.ts',
        '**/generated/**',
        '**/migrations/**',
      ],
    },
  },
})
