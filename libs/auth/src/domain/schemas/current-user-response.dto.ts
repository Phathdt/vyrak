import { ApiProperty } from '@nestjs/swagger'
import { MemberRoleSchema, type MemberRole } from '@vyrak/organization'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const CurrentUserResponseSchema = z.object({
  user: z
    .object({
      id: z.string(),
      name: z.string().or(z.null()),
      email: z.string().email(),
      image: z.string().or(z.null()),
    })
    .or(z.null()),
  organizations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      role: MemberRoleSchema,
    })
  ),
})

export class CurrentUserResponseDto extends createZodDto(CurrentUserResponseSchema) {
  @ApiProperty({
    type: 'object',
    nullable: true,
    properties: {
      id: { type: 'string' },
      name: { type: 'string', nullable: true },
      email: { type: 'string' },
      image: { type: 'string', nullable: true },
    },
  })
  user!: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        role: { type: 'string', enum: ['owner', 'admin', 'member'] },
      },
    },
  })
  organizations!: Array<{
    id: string
    name: string
    slug: string
    role: MemberRole
  }>
}
