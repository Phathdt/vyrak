import { Global, Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { ClsModule, ClsService } from 'nestjs-cls'
import { LoggerModule, PinoLogger } from 'nestjs-pino'

/**
 * Simplified CustomLoggerModule for OpenAPI generation.
 * Uses ClsModule without HTTP middleware to avoid HttpAdapterHost dependency.
 */
@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      // No middleware - avoid HttpAdapterHost dependency during OpenAPI generation
    }),
    LoggerModule.forRootAsync({
      imports: [CustomConfigModule],
      inject: [CustomConfigService],
      useFactory: (configService: CustomConfigService) => ({
        pinoHttp: {
          transport: configService.log.enableJsonFormat
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                },
              },
          level: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(configService.log.level)
            ? configService.log.level
            : 'info',
          timestamp: () => `,"time":"${new Date().toISOString()}"`,
          formatters: {
            level: (label: string) => {
              return { level: label }
            },
          },
        },
      }),
    }),
  ],
  providers: [
    {
      provide: EnhancedLogger,
      useFactory: (pinoLogger: PinoLogger, cls: ClsService) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new EnhancedLogger(pinoLogger as any, cls as any)
      },
      inject: [PinoLogger, ClsService],
    },
  ],
  exports: [EnhancedLogger],
})
export class CustomLoggerOpenApiModule {}
