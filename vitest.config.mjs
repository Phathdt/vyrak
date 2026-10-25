import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Run tests sequentially in a single worker to allow sharing global test database
    // Vitest 4+ moved poolOptions to top level
    pool: 'forks',
    singleFork: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/apps/e2e/**', // E2E tests run with Playwright, not Vitest
    ],
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
      // Coverage thresholds set at current baseline (64%) rounded down to 60%
      // Prevents regression while allowing room for improvement
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 45,
        statements: 60,
      },
    },
  },
})
