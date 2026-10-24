import { ApiProperty } from '@nestjs/swagger'

export class OrganizationResponse {
  @ApiProperty({ example: 'uuid-here', description: 'Organization ID' })
  id: string

  @ApiProperty({ example: 'Acme Inc', description: 'Organization name' })
  name: string

  @ApiProperty({ example: 'acme-inc', description: 'Organization slug' })
  slug: string

  @ApiProperty({
    type: String,
    example: 'https://example.com/logo.png',
    description: 'Organization logo URL',
    nullable: true,
    required: false,
  })
  logo: string | null

  @ApiProperty({ example: 'owner', description: 'Current user role in organization' })
  role: string

  @ApiProperty({ example: 5, description: 'Number of members' })
  memberCount: number

  @ApiProperty({ example: '2024-10-24T10:00:00Z', description: 'Creation timestamp' })
  createdAt: Date

  @ApiProperty({ example: '2024-10-24T10:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date
}

export class MemberUserResponse {
  @ApiProperty({ example: 'uuid-here', description: 'User ID' })
  id: string

  @ApiProperty({
    type: String,
    example: 'John Doe',
    description: 'User name',
    nullable: true,
    required: false,
  })
  name: string | null

  @ApiProperty({ example: 'john@example.com', description: 'User email' })
  email: string

  @ApiProperty({
    type: String,
    example: 'https://example.com/avatar.png',
    description: 'User avatar URL',
    nullable: true,
    required: false,
  })
  image: string | null
}

export class MemberResponse {
  @ApiProperty({ example: 'uuid-here', description: 'Membership ID' })
  id: string

  @ApiProperty({ example: 'owner', description: 'Member role', enum: ['owner', 'admin', 'member'] })
  role: string

  @ApiProperty({ example: '2024-10-24T10:00:00Z', description: 'Join timestamp' })
  createdAt: Date

  @ApiProperty({ type: MemberUserResponse })
  user: MemberUserResponse
}

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

  @ApiProperty({ example: '2024-10-26T10:00:00Z', description: 'Expiration timestamp' })
  expiresAt: Date

  @ApiProperty({ example: '2024-10-24T10:00:00Z', description: 'Creation timestamp' })
  createdAt: Date

  @ApiProperty({ type: OrganizationSummaryResponse, required: false })
  organization?: OrganizationSummaryResponse
}
