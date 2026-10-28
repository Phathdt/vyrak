/**
 * Artifact entity for domain layer
 * Content is stored in S3, not in the database
 */
export interface ArtifactEntity {
  id: string
  organizationId: string
  runId: string
  filePath: string
  s3Bucket: string
  s3Key: string
  contentSize: number
  contentType: string
  content: string // Fetched from S3 on-demand (empty for list operations)
  createdAt: Date
}

/**
 * Parameters for creating artifact
 */
export interface CreateArtifactParams {
  organizationId: string
  runId: string
  filePath: string
  content: string
}

/**
 * Artifact repository interface
 */
export interface IArtifactRepository {
  /**
   * Create artifact
   */
  create(params: CreateArtifactParams): Promise<ArtifactEntity>

  /**
   * Find artifact by ID
   */
  findById(artifactId: string): Promise<ArtifactEntity | null>

  /**
   * Find artifacts by run ID
   */
  findByRunId(runId: string): Promise<ArtifactEntity[]>

  /**
   * Find artifacts by organization
   */
  findByOrganization(organizationId: string): Promise<ArtifactEntity[]>

  /**
   * Delete artifact
   */
  delete(artifactId: string): Promise<void>
}
