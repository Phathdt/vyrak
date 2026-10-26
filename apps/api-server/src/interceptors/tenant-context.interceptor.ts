import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { DatabaseService } from '@vyrak/database'

import { Request } from 'express'
import { Observable } from 'rxjs'

interface TenantRequest extends Request {
  organizationId?: string
}

/**
 * Interceptor to wrap request handler in tenant context using AsyncLocalStorage
 * Runs AFTER guards, so organizationId is already set by OrganizationMemberGuard
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TenantRequest>()
    const organizationId = request.organizationId

    if (!organizationId) {
      // No tenant context for this request
      return next.handle()
    }

    // Wrap the handler execution in AsyncLocalStorage context
    // This ensures tenant context persists through the entire async chain
    return new Observable((subscriber) => {
      this.prisma
        .withOrganization(organizationId, async () => {
          return new Promise((resolve, reject) => {
            next
              .handle()
              .subscribe({
                next: (value) => {
                  subscriber.next(value)
                },
                error: (err) => {
                  subscriber.error(err)
                  reject(err)
                },
                complete: () => {
                  subscriber.complete()
                  resolve(undefined)
                },
              })
          })
        })
        .catch((error) => {
          subscriber.error(error)
        })
    })
  }
}
