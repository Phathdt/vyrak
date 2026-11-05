import { NestFactory } from '@nestjs/core'
import { CONFIG_SERVICE } from '@vyrak/custom-config'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module'

import type { IConfigService } from '@vyrak/custom-config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  app.useLogger(app.get(Logger))

  const configService = app.get<IConfigService>(CONFIG_SERVICE)
  const port = configService.host.port
  await app.listen(port)

  const logger = app.get(Logger)
  logger.log(`Worker health endpoint listening on http://localhost:${port}/healthz`)
  logger.log('Worker application started successfully')
  logger.log('Consuming events from Redis Streams...')

  let shuttingDown = false

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true

    logger.log(`${signal} received, shutting down gracefully...`)

    try {
      await app.close()
      logger.log('Worker shutdown complete')
      process.exit(0)
    } catch (error) {
      logger.error('Error during shutdown:', error)
      process.exit(1)
    }
  }

  // Graceful shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error)
    shutdown('uncaughtException')
  })

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason)
    shutdown('unhandledRejection')
  })
}

bootstrap().catch((error) => {
  console.error('Failed to start worker:', error)
  process.exit(1)
})
