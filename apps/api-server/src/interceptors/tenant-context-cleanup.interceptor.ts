import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { DatabaseService } from '@vyrak/database'

import { Observable, tap } from 'rxjs'

/**
 * Interceptor to clean up tenant context after each request
 * Ensures no tenant context leaks between requests
 */
@Injectable()
export class TenantContextCleanupInterceptor implements NestInterceptor {
  constructor(private readonly databaseService: DatabaseService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap({
        finalize: () => {
          // Clean up tenant context after response is sent
          this.databaseService.clearTenantContext()
        },
      })
    )
  }
}
