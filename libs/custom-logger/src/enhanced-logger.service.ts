import { Injectable, LoggerService } from '@nestjs/common'

import { ClsService } from 'nestjs-cls'
import { PinoLogger } from 'nestjs-pino'

@Injectable()
export class EnhancedLogger implements LoggerService {
  private metadata: Record<string, unknown> = {}

  constructor(
    private readonly pinoLogger: PinoLogger,
    private readonly cls: ClsService
  ) {}

  with(metadata: Record<string, unknown>): EnhancedLogger {
    const childLogger = new EnhancedLogger(this.pinoLogger, this.cls)
    childLogger.metadata = { ...this.metadata, ...metadata }
    return childLogger
  }

  private getContext(): Record<string, unknown> {
    const traceId = this.cls.get('traceId')

    return {
      ...(traceId && { traceId }),
      ...this.metadata,
    }
  }

  log(message: string | object, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message)
    this.pinoLogger.info({ ...this.getContext(), context }, msg)
  }

  error(message: string | object | Error, trace?: string, context?: string) {
    const msg =
      message instanceof Error ? message.message : typeof message === 'string' ? message : JSON.stringify(message)

    const errorData = {
      ...this.getContext(),
      trace,
      context,
      ...(message instanceof Error && {
        stack: message.stack,
        name: message.name,
      }),
    }

    this.pinoLogger.error(errorData, msg)
  }

  warn(message: string | object, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message)
    this.pinoLogger.warn({ ...this.getContext(), context }, msg)
  }

  debug(message: string | object, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message)
    this.pinoLogger.debug({ ...this.getContext(), context }, msg)
  }

  verbose(message: string | object, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message)
    this.pinoLogger.trace({ ...this.getContext(), context }, msg)
  }

  info(message: string | object, ...args: unknown[]) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message)
    this.pinoLogger.info({ ...this.getContext() }, msg, ...args)
  }

  fatal(message: string | object, ...args: unknown[]) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message)
    this.pinoLogger.fatal({ ...this.getContext() }, msg, ...args)
  }

  trace(message: string | object, ...args: unknown[]) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message)
    this.pinoLogger.trace({ ...this.getContext() }, msg, ...args)
  }
}
