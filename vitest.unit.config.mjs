import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./apps/web/src/test/setup.ts'],
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
        '**/*prisma.repository.ts',
        '**/*-prisma-*.ts',
        '**/repositories/**/*.ts',
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
