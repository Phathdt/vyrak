import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'

import { map } from 'rxjs/operators'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    // Skip if not HTTP context (e.g., WebSocket, etc.)
    if (context.getType() !== 'http') {
      return next.handle()
    }

    return next.handle().pipe(
      map((data) => {
        const request = context.switchToHttp().getRequest()
        const traceId = request.traceId

        // Only add traceId to the response, don't wrap in data
        if (data && typeof data === 'object') {
          return { ...data, trace_id: traceId }
        }

        return data
      })
    )
  }
}
