import { ApiProperty } from '@nestjs/swagger'

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
