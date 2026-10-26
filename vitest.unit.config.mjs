import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    isolate: false, // Reuse workers across files for faster execution
    testTimeout: 10_000,
    hookTimeout: 10_000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/apps/e2e/**',
      '**/*.integration.spec.ts',
      '**/*.integration.test.ts',
      '**/__tests__/integration/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.integration.spec.ts',
        '**/*.integration.test.ts',
        '**/index.ts',
        '**/*.config.ts',
        '**/*.config.mjs',
        '**/*.d.ts',
        '**/generated/**',
        '**/migrations/**',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 45,
        statements: 60,
      },
    },
  },
})
