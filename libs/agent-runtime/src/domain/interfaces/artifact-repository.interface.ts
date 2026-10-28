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
 * Parameters for creating artifact (public API - used by manager)
 */
export interface CreateArtifactParams {
  organizationId: string
  runId: string
  filePath: string
  content: string
}

/**
 * Parameters for creating artifact with S3 metadata (internal - used by repository)
 */
export interface CreateArtifactWithS3Params extends CreateArtifactParams {
  s3Bucket: string
  s3Key: string
  contentSize: number
  contentType: string
}

/**
 * Artifact repository interface
 */
export interface IArtifactRepository {
  /**
   * Create artifact metadata (S3 upload should happen before this)
   */
  create(params: CreateArtifactWithS3Params): Promise<ArtifactEntity>

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
