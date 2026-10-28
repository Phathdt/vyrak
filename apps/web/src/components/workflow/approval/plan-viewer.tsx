import { useState } from 'react'

import { MarkdownRenderer } from './markdown-renderer'
import { PlanFullScreenModal } from './plan-full-screen-modal'
import { PlanViewerActions } from './plan-viewer-actions'

import type { ArtifactMetadataDto } from '../../../api/generated/models'
import {
  useWorkflowsControllerGetArtifact,
  useWorkflowsControllerListArtifacts,
} from '../../../api/generated/workflows/workflows'

interface PlanViewerProps {
  orgId: string
  runId: string
}

/**
 * Fetches and displays plan artifact with markdown rendering
 * Includes download, copy, and full-screen actions
 */
export function PlanViewer({ orgId, runId }: PlanViewerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Fetch artifact metadata to find plan artifact
  const {
    data: artifactsData,
    isLoading: isLoadingArtifacts,
    error: artifactsError,
  } = useWorkflowsControllerListArtifacts(orgId, runId)

  // Find plan artifact
  const planArtifact = artifactsData?.find((artifact: ArtifactMetadataDto) => artifact.type === 'plan')

  // Fetch plan content
  const {
    data: artifactContent,
    isLoading: isLoadingContent,
    error: contentError,
    refetch: refetchContent,
  } = useWorkflowsControllerGetArtifact(orgId, runId, planArtifact?.id ?? '', {
    query: {
      enabled: !!planArtifact?.id,
    },
  })

  // Loading state
  if (isLoadingArtifacts || isLoadingContent) {
    return (
      <div className='plan-viewer-loading'>
        <div className='loading-spinner' />
        <p>Loading plan...</p>
      </div>
    )
  }

  // Error: No artifacts found
  if (artifactsError) {
    return (
      <div className='plan-viewer-error'>
        <p className='error-title'>Failed to load artifacts</p>
        <p className='error-message'>{artifactsError instanceof Error ? artifactsError.message : 'Unknown error'}</p>
      </div>
    )
  }

  // Error: No plan artifact
  if (!planArtifact) {
    return (
      <div className='plan-viewer-error'>
        <p className='error-title'>No plan artifact found</p>
        <p className='error-message'>
          The workflow has not generated a plan yet. Please wait for the planning phase to complete.
        </p>
      </div>
    )
  }

  // Error: Failed to load content
  if (contentError) {
    return (
      <div className='plan-viewer-error'>
        <p className='error-title'>Failed to load plan content</p>
        <p className='error-message'>{contentError instanceof Error ? contentError.message : 'Unknown error'}</p>
        <button type='button' onClick={() => refetchContent()} className='retry-button'>
          Retry
        </button>
      </div>
    )
  }

  const planContent =
    typeof artifactContent?.content === 'string'
      ? artifactContent.content
      : JSON.stringify(artifactContent?.content, null, 2)

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateString))
  }

  return (
    <>
      <div className='plan-viewer'>
        <div className='plan-metadata'>
          <span className='plan-metadata-item'>Created: {formatDate(planArtifact.createdAt)}</span>
          <span className='plan-metadata-separator'>•</span>
          <span className='plan-metadata-item'>Size: {formatBytes(planArtifact.size)}</span>
        </div>

        <PlanViewerActions planContent={planContent} runId={runId} onFullScreen={() => setIsFullScreen(true)} />

        <div className='plan-content-container'>
          <MarkdownRenderer content={planContent} />
        </div>
      </div>

      <PlanFullScreenModal isOpen={isFullScreen} planContent={planContent} onClose={() => setIsFullScreen(false)} />
    </>
  )
}
