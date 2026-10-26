import type { ArtifactEntity } from '@vyrak/agent-runtime'

import type { ArtifactContentDto, ArtifactMetadataDto } from '../dto'

function calculateSize(content: string): number {
  return Buffer.byteLength(content, 'utf8')
}

function inferContentType(filePath: string): string {
  if (filePath.endsWith('.json')) {
    return 'application/json'
  }
  if (filePath.endsWith('.md')) {
    return 'text/markdown'
  }
  if (filePath.endsWith('.txt')) {
    return 'text/plain'
  }
  return 'text/plain'
}

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
    size: calculateSize(artifact.content),
    contentType: inferContentType(artifact.filePath),
    createdAt: artifact.createdAt.toISOString(),
  }
}

export function toArtifactContentDto(artifact: ArtifactEntity, runId: string): ArtifactContentDto {
  const contentType = inferContentType(artifact.filePath)
  let content: string | Record<string, unknown> = artifact.content

  // Try to parse JSON content
  if (contentType === 'application/json') {
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
    contentType,
    content,
    size: calculateSize(artifact.content),
  }
}
