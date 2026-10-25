import { createAppConfig } from '../../config/rolldown.base.mjs'

export default createAppConfig({
  input: { main: 'src/main.ts' },
  appName: 'worker',
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
})
