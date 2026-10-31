import type { DatabaseService } from '../database.service'

/**
 * Base repository class that automatically injects organizationId from tenant context
 *
 * Usage:
 * ```ts
 * export class ProjectPrismaRepository extends BaseTenantRepository implements IProjectRepository {
 *   constructor(prisma: DatabaseService) {
 *     super(prisma)
 *   }
 *
 *   async create(data: CreateProjectDto): Promise<ProjectWithStats> {
 *     const orgId = this.getOrganizationId()
 *     // or use withTenantContext helper
 *     return this.withTenantContext((orgId) => {
 *       return this.prisma.client.project.create({
 *         data: { ...data, organizationId: orgId }
 *       })
 *     })
 *   }
 * }
 * ```
 */
export abstract class BaseTenantRepository {
  constructor(protected readonly prisma: DatabaseService) {}

  /**
   * Get current organization ID from tenant context
   * @throws Error if organizationId is not set in context
   */
  protected getOrganizationId(): string {
    const context = this.prisma.getTenantContext()

    if (!context.organizationId) {
      throw new Error(
        `Organization context not set. Use DatabaseService.setTenantContext() or withOrganization() before calling repository methods.`
      )
    }

    return context.organizationId
  }

  /**
   * Get current organization ID from tenant context (nullable)
   * Returns null if organizationId is not set
   */
  protected getOrganizationIdOrNull(): string | null {
    const context = this.prisma.getTenantContext()
    return context.organizationId ?? null
  }

  /**
   * Helper to execute repository operations with automatic organizationId injection
   *
   * @example
   * ```ts
   * async findOne(id: string): Promise<Project | null> {
   *   return this.withTenantContext((orgId) => {
   *     return this.prisma.client.project.findFirst({
   *       where: { id, organizationId: orgId }
   *     })
   *   })
   * }
   * ```
   */
  protected async withTenantContext<T>(fn: (organizationId: string) => Promise<T>): Promise<T> {
    const organizationId = this.getOrganizationId()
    return fn(organizationId)
  }

  /**
   * Execute operation with system access (bypass tenant filter)
   * Useful for system-level operations that need to access data across tenants
   */
  protected async withSystemAccess<T>(fn: () => Promise<T>): Promise<T> {
    return this.prisma.withSystemAccess(fn)
  }
}
