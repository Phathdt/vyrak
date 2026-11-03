import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { map } from 'rxjs/operators'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    // Skip if not HTTP context (e.g., WebSocket, etc.)
    if (context.getType() !== 'http') {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    // Skip for SSE endpoints - they handle their own data format
    const isSSE =
      request.url?.includes('/chat-stream') ||
      request.headers.accept?.includes('text/event-stream') ||
      response.getHeader('content-type')?.includes('text/event-stream')

    if (isSSE) {
      return next.handle()
    }

    return next.handle().pipe(
      map((data) => {
        const traceId = request.traceId

        // Skip adding trace_id to arrays to preserve array structure
        if (Array.isArray(data)) {
          return { data, trace_id: traceId }
        }

        // Only add traceId to objects
        if (data && typeof data === 'object') {
          return { ...data, trace_id: traceId }
        }

        return data
      })
    )
  }
}
