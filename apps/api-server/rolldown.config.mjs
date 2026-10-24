import { defineConfig } from 'rolldown'

export default defineConfig({
  input: {
    main: 'src/main.ts',
    'generate-openapi': 'src/generate-openapi.ts',
  },
  output: {
    dir: '../../dist/apps/api-server',
    format: 'cjs',
    sourcemap: true,
    entryFileNames: '[name].js',
  },
  // External: npm packages and node built-ins, but NOT @vyrak/* (bundle them)
  external: [
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
  tsconfig: '../../tsconfig.json',
})
