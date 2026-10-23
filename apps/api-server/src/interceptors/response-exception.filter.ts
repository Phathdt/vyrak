import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'

import { Response } from 'express'
import { v7 as uuidv7 } from 'uuid'

@Catch()
export class ResponseExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const traceId = (request as Request & { traceId?: string }).traceId || uuidv7()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let error = 'Unknown error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const responseBody = exception.getResponse() as string | object

      if (typeof responseBody === 'object' && responseBody !== null) {
        const errorResponse = responseBody as { error?: string; message?: string }
        error = errorResponse.error || exception.message || 'Error'
        message = errorResponse.message || 'An error occurred'
      } else {
        error = exception.message
        message = typeof responseBody === 'string' ? responseBody : 'An error occurred'
      }
    } else if (exception instanceof Error) {
      error = exception.message
      message = exception.name
    }

    response.status(status).header('X-Trace-Id', traceId).json({
      statusCode: status,
      message: error,
      error: message,
      traceId: traceId,
    })
  }
}
