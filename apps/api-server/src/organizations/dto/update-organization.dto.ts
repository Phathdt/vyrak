import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().url().optional(),
})

export class UpdateOrganizationDto extends createZodDto(UpdateOrganizationSchema) {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Organization name',
    required: false,
    minLength: 1,
    maxLength: 100,
  })
  name?: string

  @ApiProperty({
    example: 'https://example.com/logo.png',
    description: 'Organization logo URL',
    required: false,
  })
  logo?: string
}
