import { Global, Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'
import { IncomingMessage, ServerResponse } from 'http'
import { ClsModule, ClsService } from 'nestjs-cls'
import { LoggerModule, PinoLogger } from 'nestjs-pino'
import 'pino-pretty' // Required for pino transport
import { v7 as uuidv7 } from 'uuid'

import { EnhancedLogger } from './enhanced-logger.service'

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req) => {
          return (req.headers['x-trace-id'] as string) || uuidv7()
        },
      },
    }),
    LoggerModule.forRootAsync({
      imports: [CustomConfigModule],
      inject: [CustomConfigService, ClsService],
      useFactory: (configService: CustomConfigService, cls: ClsService) => ({
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
          serializers: {
            req: (
              req: IncomingMessage & {
                id?: string
                query?: Record<string, unknown>
                params?: Record<string, unknown>
              }
            ) => ({
              id: (req as unknown as Record<string, unknown>).id,
              method: req.method,
              url: req.url,
              query: (req as unknown as Record<string, unknown>).query,
              params: (req as unknown as Record<string, unknown>).params,
              headers: {
                host: req.headers.host,
              },
              remoteAddress: req.socket?.remoteAddress,
              remotePort: req.socket?.remotePort,
            }),
            res: (res: ServerResponse) => ({
              statusCode: res.statusCode,
              headers: res.getHeaders ? res.getHeaders() : {},
            }),
          },
          customProps: (req: IncomingMessage, _res: ServerResponse) => {
            const traceId = cls.getId() || String((req as unknown as Record<string, unknown>).id || '')
            const connection = (req as unknown as Record<string, { remoteAddress?: string }>).connection
            return {
              traceId,
              userAgent: req.headers['user-agent'],
              ip: req.socket?.remoteAddress || connection?.remoteAddress,
              timestamp: new Date().toISOString(),
            }
          },
        },
      }),
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: EnhancedLogger,
      useFactory: (pinoLogger: PinoLogger, cls: ClsService) => {
        return new EnhancedLogger(pinoLogger, cls)
      },
      inject: [PinoLogger, ClsService],
    },
  ],
  exports: [EnhancedLogger],
})
export class CustomLoggerModule {}
