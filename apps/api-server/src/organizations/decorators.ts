import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'

import { Request } from 'express'

// Decorator để lấy userId từ session
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { userId?: string }>()
  const userId = request.userId

  if (!userId) {
    throw new Error('User not authenticated')
  }

  return userId
})

// Decorator để mark route as public (không cần authentication)
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
