import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/main.ts',
  output: {
    dir: '../../dist/apps/worker',
    format: 'cjs',
    sourcemap: true,
    entryFileNames: '[name].js',
  },
  // External: npm packages and node built-ins, but NOT @vyrak/* (bundle them)
  external: [
    /^@nestjs\//,
    /^bullmq$/,
    /^dotenv/,
    /^nestjs-/,
    /^pino/,
    /^reflect-metadata$/,
    /^rxjs/,
    /^ioredis$/,
    /node:/,
  ],
  tsconfig: '../../tsconfig.json',
})
