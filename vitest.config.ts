import { resolve } from 'path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['libs/**/*.spec.ts', 'libs/**/*.test.ts', 'apps/**/*.spec.ts', 'apps/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['libs/**/src/**/*.ts', 'apps/**/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.test.ts', '**/index.ts', '**/node_modules/**'],
    },
    passWithNoTests: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['reflect-metadata'],
  },
  resolve: {
    alias: {
      '@vyrak/custom-config': resolve(__dirname, 'libs/custom-config/src/index.ts'),
      '@vyrak/custom-logger': resolve(__dirname, 'libs/custom-logger/src/index.ts'),
      '@vyrak/database': resolve(__dirname, 'libs/database/src/index.ts'),
    },
  },
})
