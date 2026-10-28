import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'
import { Request } from 'express'

// Decorator để lấy userId từ JWT payload (set bởi Passport JWT strategy)
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: { userId: string; email: string } }>()
  const userId = request.user?.userId

  if (!userId) {
    throw new Error('User not authenticated')
  }

  return userId
})

// Decorator để lấy organizationId từ request (set bởi OrganizationMemberGuard)
export const CurrentOrganization = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { organizationId?: string }>()
  const organizationId = request.organizationId

  if (!organizationId) {
    throw new Error('Organization context not set')
  }

  return organizationId
})

// Decorator để mark route as public (không cần authentication)
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
