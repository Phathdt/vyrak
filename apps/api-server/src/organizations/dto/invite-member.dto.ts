import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

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
