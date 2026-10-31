import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'

import type { DatabaseService } from '../database.service'

/**
 * Interceptor that automatically sets tenant context from route parameters
 *
 * This interceptor extracts organizationId from route params (orgId, organizationId)
 * and sets it in the AsyncLocalStorage context before executing the route handler.
 *
 * Usage in controller:
 * ```ts
 * @Controller('api/organizations/:orgId/projects')
 * @UseInterceptors(TenantContextInterceptor)
 * export class ProjectsController {
 *   // All methods will automatically have tenant context set
 * }
 * ```
 *
 * Or globally in main.ts:
 * ```ts
 * app.useGlobalInterceptors(new TenantContextInterceptor(databaseService))
 * ```
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly databaseService: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const params = request.params

    // Extract organizationId from route params
    // Support multiple param names: orgId, organizationId, org_id
    const organizationId = params.orgId || params.organizationId || params.org_id

    if (organizationId) {
      // Set tenant context using AsyncLocalStorage
      this.databaseService.setTenantContext(organizationId)
    }

    return next.handle()
  }
}
