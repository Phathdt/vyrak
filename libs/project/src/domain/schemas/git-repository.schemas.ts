import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Create Repository DTO
export const CreateGitRepositorySchema = z.object({
  url: z.string().min(1, 'Repository URL is required').max(500, 'URL too long'),
  branch: z.string().min(1).max(100).optional(),
})

export class CreateGitRepositoryDto extends createZodDto(CreateGitRepositorySchema) {
  @ApiProperty({
    example: 'https://github.com/acme/backend-api',
    description: 'GitHub repository URL (HTTPS, SSH, or owner/repo format)',
  })
  url: string

  @ApiProperty({
    example: 'main',
    description: 'Branch name (defaults to repository default branch if not specified)',
    required: false,
  })
  branch?: string
}

export class GitRepositoryResponse {
  @ApiProperty({ example: 'uuid-here', description: 'Repository ID' })
  id: string

  @ApiProperty({ example: 'uuid-project', description: 'Project ID' })
  projectId: string

  @ApiProperty({ example: 'uuid-org', description: 'Organization ID' })
  organizationId: string

  @ApiProperty({ example: 'backend-api', description: 'Repository display name' })
  name: string

  @ApiProperty({ example: 'https://github.com/acme/backend-api', description: 'Clone URL' })
  url: string

  @ApiProperty({ example: 'main', description: 'Default branch' })
  branch: string

  @ApiProperty({ example: 'github', description: 'Git provider' })
  provider: string

  @ApiProperty({ example: 'active', description: 'Repository status' })
  status: string

  @ApiProperty({ example: '2024-10-24T10:00:00Z', description: 'Creation timestamp' })
  createdAt: string

  @ApiProperty({ example: '2024-10-24T10:00:00Z', description: 'Last update timestamp' })
  updatedAt: string
}

export class GitRepositoryListResponse {
  @ApiProperty({ type: [GitRepositoryResponse], description: 'Repositories linked to the project' })
  items: GitRepositoryResponse[]
}
