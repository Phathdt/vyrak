import { All, Controller, Get, Req, Res } from '@nestjs/common'
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger'
import { auth, AuthService, CurrentUserResponseSchema } from '@vyrak/auth'

import { Request, Response } from 'express'
import { z } from 'zod'

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user with organization' })
  async getCurrentUser(@Req() req: Request): Promise<z.infer<typeof CurrentUserResponseSchema>> {
    // Get session from Better Auth
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user) {
      return {
        user: null,
        organizations: [],
      }
    }

    const userId = session.user.id

    // Handle onboarding if user doesn't have organization
    await this.authService.handleUserOnboarding(userId)

    // Get user with organizations
    const user = await this.authService.getCurrentUser(userId)

    return {
      user: {
        id: user?.id || userId,
        name: user?.name ?? session.user.name ?? null,
        email: user?.email || session.user.email,
        image: user?.image ?? session.user.image ?? null,
      },
      organizations:
        user?.members.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role as 'owner' | 'admin' | 'member',
        })) || [],
    }
  }

  @All('*')
  @ApiExcludeEndpoint()
  async handleAuth(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
    try {
      // Convert Express request to Web Request format for Better Auth
      const url = new URL(req.url, `${req.protocol}://${req.get('host')}`)

      // For GET/HEAD requests, body should be null
      let body: string | null = null
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        body = JSON.stringify(req.body)
      }

      const webRequest = new globalThis.Request(url.toString(), {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body,
      })

      const webResponse = await auth.handler(webRequest)

      // Check status before consuming body
      const isSignup = req.url.includes('/sign-up/email') && req.method === 'POST'
      const isSuccess = webResponse.status === 200

      // Convert Web Response back to Express response
      res.status(webResponse.status)

      webResponse.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value)
      })

      const text = await webResponse.text()

      // After successful signup, create default organization
      if (isSignup && isSuccess) {
        try {
          const responseData = JSON.parse(text)

          if (responseData.user?.id) {
            await this.authService.handleUserOnboarding(responseData.user.id)
          }
        } catch (error) {
          console.error('[Auth Controller] Failed to handle onboarding:', error)
        }
      }

      res.send(text)
    } catch (error) {
      console.error('[Auth Controller Error]', error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Authentication error' })
      }
    }
  }
}
