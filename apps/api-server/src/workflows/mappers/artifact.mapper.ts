import type { ArtifactContentDto, ArtifactMetadataDto } from '../dto'
import type { ArtifactEntity } from '@vyrak/agent-runtime'

function inferArtifactType(
  filePath: string
): 'plan' | 'implementation_report' | 'test_result' | 'approval_plan' | 'other' {
  const fileName = filePath.toLowerCase()
  if (fileName.includes('plan') && fileName.includes('approval')) {
    return 'approval_plan'
  }
  if (fileName.includes('plan')) {
    return 'plan'
  }
  if (fileName.includes('report')) {
    return 'implementation_report'
  }
  if (fileName.includes('test')) {
    return 'test_result'
  }
  return 'other'
}

export function toArtifactMetadataDto(artifact: ArtifactEntity, runId: string): ArtifactMetadataDto {
  return {
    id: artifact.id,
    runId,
    stepKey: null, // Not tracked in current ArtifactEntity schema
    type: inferArtifactType(artifact.filePath),
    name: artifact.filePath.split('/').pop() ?? 'Unnamed artifact',
    size: artifact.contentSize, // Use stored size from database
    contentType: artifact.contentType, // Use stored content type from database
    createdAt: artifact.createdAt.toISOString(),
  }
}

export function toArtifactContentDto(artifact: ArtifactEntity, runId: string): ArtifactContentDto {
  let content: string | Record<string, unknown> = artifact.content

  // Try to parse JSON content
  if (artifact.contentType === 'application/json') {
    try {
      content = JSON.parse(artifact.content)
    } catch {
      // Keep as string if JSON parse fails
      content = artifact.content
    }
  }

  return {
    id: artifact.id,
    runId,
    name: artifact.filePath.split('/').pop() ?? 'Unnamed artifact',
    contentType: artifact.contentType, // Use stored content type from database
    content,
    size: artifact.contentSize, // Use stored size from database
  }
}
