import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

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
