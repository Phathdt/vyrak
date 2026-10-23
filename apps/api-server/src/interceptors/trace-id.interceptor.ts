import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common'

import { Request, Response } from 'express'
import { ClsService } from 'nestjs-cls'
import { Observable, throwError } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'

interface TraceableRequest extends Request {
  traceId?: string
}

interface ErrorResponse {
  statusCode: number
  message: string | string[]
  error?: string
  [key: string]: unknown
}

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Skip if not HTTP context (e.g., WebSocket, etc.)
    if (context.getType() !== 'http') {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest<TraceableRequest>()
    const response = context.switchToHttp().getResponse<Response>()

    // Skip if response doesn't have setHeader method
    if (!response || typeof response.setHeader !== 'function') {
      return next.handle()
    }

    // Get traceId from CLS context (set by ClsMiddleware)
    const traceId = this.cls.getId() || 'unknown'
    request.traceId = traceId

    return next.handle().pipe(
      tap(() => {
        response.setHeader('X-Trace-Id', traceId)
      }),
      catchError((error: unknown) => {
        response.setHeader('X-Trace-Id', traceId)

        if (error instanceof HttpException) {
          const statusCode = error.getStatus()
          const errorResponse = error.getResponse() as string | ErrorResponse

          const modifiedError: ErrorResponse = {
            statusCode,
            message: typeof errorResponse === 'string' ? errorResponse : errorResponse.message,
            error: typeof errorResponse === 'string' ? error.name : errorResponse.error || error.name,
            traceId: traceId,
          }

          if (typeof errorResponse === 'object') {
            Object.assign(modifiedError, errorResponse)
          }

          error.getResponse = () => modifiedError
        } else if (error instanceof Error) {
          ;(error as Error & { traceId: string }).traceId = traceId
        }

        return throwError(() => error)
      })
    )
  }
}
