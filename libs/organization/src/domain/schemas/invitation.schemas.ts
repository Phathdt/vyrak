import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Invite Member
export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
})

export class InviteMemberDto extends createZodDto(InviteMemberSchema) {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the user to invite',
    format: 'email',
  })
  email: string

  @ApiProperty({
    example: 'member',
    description: 'Role to assign to the invited user',
    enum: ['admin', 'member'],
  })
  role: 'admin' | 'member'
}

// Invitation Response
export class OrganizationSummaryResponse {
  @ApiProperty({ example: 'uuid-here', description: 'Organization ID' })
  id: string

  @ApiProperty({ example: 'Acme Inc', description: 'Organization name' })
  name: string

  @ApiProperty({ example: 'acme-inc', description: 'Organization slug' })
  slug: string
}

export class InvitationResponse {
  @ApiProperty({ example: 'uuid-here', description: 'Invitation ID' })
  id: string

  @ApiProperty({ example: 'john@example.com', description: 'Invitee email' })
  email: string

  @ApiProperty({ example: 'member', description: 'Role to assign', enum: ['admin', 'member'] })
  role: string

  @ApiProperty({
    example: 'pending',
    description: 'Invitation status',
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
  })
  status: string

  @ApiProperty({ example: '2026-10-26T10:00:00Z', description: 'Expiration timestamp' })
  expiresAt: Date

  @ApiProperty({ example: '2024-10-24T10:00:00Z', description: 'Creation timestamp' })
  createdAt: Date

  @ApiProperty({ type: OrganizationSummaryResponse, required: false })
  organization?: OrganizationSummaryResponse
}
