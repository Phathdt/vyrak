/* eslint-disable @typescript-eslint/no-explicit-any */
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export class SnakeToCamelInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.convertToSnakeCase(data)))
  }

  private convertToSnakeCase(obj: any): any {
    // Handle null, undefined, or primitive values
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((v) => this.convertToSnakeCase(v))
    }

    // Only transform plain objects (not class instances, Dates, etc.)
    if (obj.constructor === Object) {
      return Object.keys(obj).reduce(
        (result, key) => ({
          ...result,
          [this.camelToSnakeCase(key)]: this.convertToSnakeCase(obj[key]),
        }),
        {}
      )
    }

    // Return non-plain objects as-is (class instances, Dates, etc.)
    return obj
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }
}
