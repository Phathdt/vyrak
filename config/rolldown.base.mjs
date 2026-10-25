import { defineConfig } from 'rolldown'

/**
 * Base Rolldown configuration for libs
 * Usage in libs rolldown.config.mjs
 *
 * import { createLibConfig } from '../../config/rolldown.base.mjs'
 * export default createLibConfig()
 */
export function createLibConfig(options = {}) {
  const {
    input = 'src/index.ts',
    outDir = 'dist',
    external = [/^@/, /^[a-z]/],
    tsconfig = '../../tsconfig.json',
    ...overrides
  } = options

  return defineConfig({
    input,
    output: {
      dir: outDir,
      format: 'cjs',
      sourcemap: true,
      entryFileNames: '[name].js',
    },
    external,
    tsconfig,
    ...overrides,
  })
}

/**
 * Base Rolldown configuration for apps
 * Usage in apps rolldown.config.mjs
 *
 * import { createAppConfig } from '../../config/rolldown.base.mjs'
 * export default createAppConfig({
 *   input: { main: 'src/main.ts' },
 *   appName: 'api-server'
 * })
 */
export function createAppConfig(options = {}) {
  const {
    input = { main: 'src/main.ts' },
    appName,
    external = [
      /^@nestjs\//,
      /^@prisma\//,
      /^argon2$/,
      /^axios$/,
      /^bullmq$/,
      /^cache-manager$/,
      /^dotenv/,
      /^express$/,
      /^ioredis$/,
      /^jose$/,
      /^keyv$/,
      /^nestjs-/,
      /^passport/,
      /^pino/,
      /^reflect-metadata$/,
      /^rxjs/,
      /^uuid$/,
      /^zod$/,
      /^pg$/,
      /^js-yaml$/,
      /node:/,
    ],
    tsconfig = '../../tsconfig.json',
    ...overrides
  } = options

  if (!appName) {
    throw new Error('appName is required for createAppConfig')
  }

  return defineConfig({
    input,
    output: {
      dir: `../../dist/apps/${appName}`,
      format: 'cjs',
      sourcemap: true,
      entryFileNames: '[name].js',
    },
    external,
    tsconfig,
    ...overrides,
  })
}
