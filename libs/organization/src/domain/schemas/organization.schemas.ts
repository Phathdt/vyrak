import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Create Organization
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

// Update Organization
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

// Organization Response
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

export interface OrganizationWithRole {
  id: string
  name: string
  slug: string
  logo: string | null
  role: string
  memberCount: number
  createdAt: Date
  updatedAt: Date
}
