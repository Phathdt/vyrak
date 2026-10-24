import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  logo: z.string().url().optional(),
})

export class CreateOrganizationDto extends createZodDto(CreateOrganizationSchema) {
  @ApiProperty({
    example: 'Acme Inc',
    description: 'Organization name',
    minLength: 1,
    maxLength: 100,
  })
  name: string

  @ApiProperty({
    example: 'acme-inc',
    description: 'Unique organization slug (lowercase, alphanumeric, hyphens only)',
    pattern: '^[a-z0-9-]+$',
    minLength: 3,
    maxLength: 50,
  })
  slug: string

  @ApiProperty({
    example: 'https://example.com/logo.png',
    description: 'Organization logo URL',
    required: false,
  })
  logo?: string
}
