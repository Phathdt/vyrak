/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { CustomConfigService } from '@vyrak/custom-config'
import { SnakeToCamelInterceptor } from '@vyrak/shared'

import 'dotenv/config'

import { LoggerErrorInterceptor, Logger as PinoLogger } from 'nestjs-pino'
import { ZodValidationPipe } from 'nestjs-zod'

import { AppModule } from './app'
import { ResponseExceptionFilter, ResponseLoggerInterceptor, ZodValidationExceptionFilter } from './interceptors'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  })

  const configService = app.get(CustomConfigService)

  app.useGlobalPipes(new ZodValidationPipe())

  app.useGlobalFilters(new ResponseExceptionFilter(), new ZodValidationExceptionFilter())
  // TraceIdInterceptor and ResponseInterceptor are registered via APP_INTERCEPTOR in app.module.ts
  // to enable proper dependency injection of ClsService
  app.useGlobalInterceptors(
    new ResponseLoggerInterceptor(),
    new LoggerErrorInterceptor(),
    new SnakeToCamelInterceptor()
  )

  app.useLogger(app.get(PinoLogger))

  const config = new DocumentBuilder()
    .setTitle('Vyrak')
    .setDescription('The Vyrak API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const documentFactory = () => SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, documentFactory)

  const port = configService.host.port
  await app.listen(port)
  console.log(`Application is running on: http://localhost:${port}`)
}

bootstrap()
