import react from '@vitejs/plugin-react'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.spec.tsx',
        '**/*.test.tsx',
        'src/api/generated/**',
        'src/main.tsx',
        'vite.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
