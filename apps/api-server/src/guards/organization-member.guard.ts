import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { DatabaseService } from '@vyrak/database'
import { Request } from 'express'

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    email: string
  }
  organizationId?: string
  memberRole?: string
}

/**
 * Guard to verify user is member of the organization in the route
 * Also sets tenant context for the request
 */
@Injectable()
export class OrganizationMemberGuard implements CanActivate {
  constructor(private readonly prisma: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const userId = request.user?.userId

    if (!userId) {
      throw new ForbiddenException('Authentication required')
    }

    // Extract organizationId from params or query
    const organizationId =
      request.params.organizationId ||
      request.params.orgId ||
      (typeof request.query?.organizationId === 'string' ? request.query.organizationId : undefined)

    if (!organizationId || typeof organizationId !== 'string') {
      // No specific organization in route - allow if user authenticated
      return true
    }

    // Verify membership using system access (bypass tenant filter)
    const membership = await this.prisma.withSystemAccess(async () => {
      return this.prisma.client.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
      })
    })

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization')
    }

    // Attach organization context to request
    request.organizationId = organizationId
    request.memberRole = membership.role

    return true
  }
}
