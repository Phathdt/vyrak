import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
