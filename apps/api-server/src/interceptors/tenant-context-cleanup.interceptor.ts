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
    // Let the request complete first, then cleanup in finalize
    return next.handle().pipe(
      tap({
        next: () => {
          // Do nothing on success - let request complete
        },
        error: () => {
          // Clean up on error
          this.databaseService.clearTenantContext()
        },
        finalize: () => {
          // Clean up tenant context after response is fully sent
          this.databaseService.clearTenantContext()
        },
      })
    )
  }
}
