import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Update Member Role
export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
})

export class UpdateMemberRoleDto extends createZodDto(UpdateMemberRoleSchema) {
  @ApiProperty({
    example: 'admin',
    description: 'New role for the member',
    enum: ['owner', 'admin', 'member'],
  })
  role: 'owner' | 'admin' | 'member'
}

// Member Response
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
