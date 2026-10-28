import { ApiProperty } from '@nestjs/swagger'
import { z } from 'zod'

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().or(z.null()),
  }),
})

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string

  @ApiProperty({ description: 'Token expiry time in seconds' })
  expiresIn!: number

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string', nullable: true },
    },
  })
  user!: {
    id: string
    email: string
    name: string | null
  }
}
