import type { Story } from '@vyrak/database'

export interface CreateStoryData {
  workflowRunId: string
  orderIndex: number
  title: string
  description?: string
  acceptanceCriteria?: unknown
  estimatedDuration?: number
}

export interface UpdateStoryStatusData {
  status: string
  startedAt?: Date
  completedAt?: Date
  duration?: number
}

export interface SubStepData {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  error?: string
}

/**
 * Story Repository Interface
 *
 * Defines contract for accessing and managing workflow stories
 */
export interface IStoryRepository {
  /**
   * Create multiple stories in batch
   */
  createMany(stories: CreateStoryData[]): Promise<Story[]>

  /**
   * Get all stories for a workflow run, ordered by orderIndex
   */
  findByWorkflowRunId(workflowRunId: string): Promise<Story[]>

  /**
   * Get single story by ID
   */
  findById(storyId: string): Promise<Story | null>

  /**
   * Update story status
   */
  updateStatus(storyId: string, data: UpdateStoryStatusData): Promise<Story>

  /**
   * Append sub-step to story's subSteps array
   */
  appendSubStep(storyId: string, subStep: SubStepData): Promise<Story>

  /**
   * Save story artifacts
   */
  saveArtifacts(storyId: string, artifacts: unknown): Promise<Story>

  /**
   * Mark story as skipped with reason
   */
  skip(storyId: string, reason: string): Promise<Story>

  /**
   * Reset story for retry (clear error, set to queued)
   */
  retry(storyId: string): Promise<Story>

  /**
   * Update sub-step status within story
   */
  updateSubStep(storyId: string, subStepName: string, status: string, error?: string): Promise<Story>
}
