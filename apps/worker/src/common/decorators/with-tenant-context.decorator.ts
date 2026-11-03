import { DatabaseService } from '@vyrak/database'

/**
 * Metadata interface for events/jobs that require tenant context
 */
export interface TenantContextMetadata {
  orgId: string
  [key: string]: unknown
}

/**
 * Wrapper function to extract orgId from event/job and set tenant context
 * Usage:
 * ```typescript
 * private handleEvent = withTenantContext(
 *   this.databaseService,
 *   async (event: MyEvent) => {
 *     // orgId already set in context
 *     await this.service.doSomething()
 *   }
 * )
 * ```
 */
export function withTenantContext<TEvent extends { metadata: TenantContextMetadata }, TResult = void>(
  databaseService: DatabaseService,
  handler: (event: TEvent) => Promise<TResult>
): (event: TEvent) => Promise<TResult> {
  return async (event: TEvent): Promise<TResult> => {
    const orgId = event.metadata?.orgId

    if (!orgId) {
      throw new Error('Missing orgId in event metadata. All worker events must include metadata.orgId for tenant isolation.')
    }

    // Set tenant context before executing handler
    databaseService.setTenantContext(orgId)

    return handler(event)
  }
}
