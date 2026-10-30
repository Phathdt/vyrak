import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AUTH_SERVICE, AuthResponseDto, CurrentUserResponseDto, IAuthService, LoginDto } from '@vyrak/auth'
import { Request } from 'express'

import { JwtAuthGuard } from '../../guards'

interface RequestWithUser extends Request {
  user: {
    userId: string
    email: string
  }
}

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly authService: IAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 201, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto.email, dto.password)
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user with organizations' })
  @ApiResponse({ status: 200, description: 'User info retrieved', type: CurrentUserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: RequestWithUser): Promise<CurrentUserResponseDto> {
    const userId = req.user.userId

    // Get user with organizations (onboarding handled internally by AuthService)
    const user = await this.authService.getCurrentUser(userId)

    if (!user) {
      return {
        user: null,
        organizations: [],
      }
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      organizations: user.members.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role as 'owner' | 'admin' | 'member',
      })),
    }
  }
}
