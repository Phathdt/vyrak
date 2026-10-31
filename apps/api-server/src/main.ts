/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import './load-env'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { CustomConfigService } from '@vyrak/custom-config'
import { DatabaseService, TenantContextInterceptor } from '@vyrak/database'
import { LoggerErrorInterceptor, Logger as PinoLogger } from 'nestjs-pino'
import { ZodValidationPipe } from 'nestjs-zod'

import { AppModule } from './app'
import { ResponseExceptionFilter, ResponseLoggerInterceptor, ZodValidationExceptionFilter } from './interceptors'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const configService = app.get(CustomConfigService)
  const databaseService = app.get(DatabaseService)

  const corsOrigins = [configService.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(
    (origin, index, list) => origin && origin !== 'replace_me' && list.indexOf(origin) === index
  )

  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  })

  app.useGlobalPipes(new ZodValidationPipe())

  app.useGlobalFilters(new ResponseExceptionFilter(), new ZodValidationExceptionFilter())
  // TraceIdInterceptor and ResponseInterceptor are registered via APP_INTERCEPTOR in app.module.ts
  // to enable proper dependency injection of ClsService
  // TenantContextInterceptor must be first to set context before other interceptors
  app.useGlobalInterceptors(
    new TenantContextInterceptor(databaseService),
    new ResponseLoggerInterceptor(),
    new LoggerErrorInterceptor()
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
