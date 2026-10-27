import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { Story } from '@vyrak/database'

import type { CreateStoryData, IStoryRepository, SubStepData } from '../../domain/interfaces/story.repository.interface'

/**
 * Story count limits by workflow template type
 */
const StoryCountLimits = {
  hotfix: { min: 1, max: 1 },
  feature: { min: 1, max: 20 },
}

export interface CreateStoriesInput {
  workflowRunId: string
  templateType: 'hotfix' | 'feature'
  stories: Array<{
    title: string
    description?: string
    acceptanceCriteria?: unknown
    estimatedDuration?: number
  }>
}

/**
 * Story Service Interface
 */
export interface IStoryService {
  createStories(input: CreateStoriesInput): Promise<Story[]>
  getStories(workflowRunId: string): Promise<Story[]>
  getStory(storyId: string): Promise<Story>
  updateStoryStatus(storyId: string, status: string): Promise<Story>
  updateStoryProgress(storyId: string, subStep: SubStepData): Promise<Story>
  saveStoryArtifacts(storyId: string, artifacts: unknown): Promise<Story>
  skipStory(storyId: string, reason: string): Promise<Story>
  retryStory(storyId: string): Promise<Story>
}

/**
 * Story Service
 *
 * Manages workflow stories and their execution lifecycle
 * Plain TypeScript class - no @Injectable decorator per CLAUDE.md rules
 */
export class StoryService implements IStoryService {
  constructor(private readonly repository: IStoryRepository) {}

  async createStories(input: CreateStoriesInput): Promise<Story[]> {
    const { workflowRunId, templateType, stories } = input

    // Validate story count
    const limits = StoryCountLimits[templateType]
    if (!limits) {
      throw new BadRequestException(`Unknown template type: ${templateType}`)
    }

    if (stories.length < limits.min || stories.length > limits.max) {
      throw new BadRequestException(
        `${templateType} workflows must have between ${limits.min} and ${limits.max} stories (received ${stories.length})`
      )
    }

    // Create stories with order index
    const storiesData: CreateStoryData[] = stories.map((story, index) => ({
      workflowRunId,
      orderIndex: index,
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria,
      estimatedDuration: story.estimatedDuration,
    }))

    return this.repository.createMany(storiesData)
  }

  async getStories(workflowRunId: string): Promise<Story[]> {
    return this.repository.findByWorkflowRunId(workflowRunId)
  }

  async getStory(storyId: string): Promise<Story> {
    const story = await this.repository.findById(storyId)

    if (!story) {
      throw new NotFoundException(`Story with ID ${storyId} not found`)
    }

    return story
  }

  async updateStoryStatus(storyId: string, status: string): Promise<Story> {
    const story = await this.getStory(storyId)

    const updateData: {
      status: string
      startedAt?: Date
      completedAt?: Date
      duration?: number
    } = { status }

    // Set timestamps based on status
    if (status === 'running' && !story.startedAt) {
      updateData.startedAt = new Date()
    }

    if ((status === 'completed' || status === 'failed' || status === 'skipped') && story.startedAt) {
      updateData.completedAt = new Date()
      updateData.duration = Math.floor((updateData.completedAt.getTime() - story.startedAt.getTime()) / 1000)
    }

    return this.repository.updateStatus(storyId, updateData)
  }

  async updateStoryProgress(storyId: string, subStep: SubStepData): Promise<Story> {
    await this.getStory(storyId) // Verify story exists
    return this.repository.appendSubStep(storyId, subStep)
  }

  async saveStoryArtifacts(storyId: string, artifacts: unknown): Promise<Story> {
    await this.getStory(storyId) // Verify story exists
    return this.repository.saveArtifacts(storyId, artifacts)
  }

  async skipStory(storyId: string, reason: string): Promise<Story> {
    await this.getStory(storyId) // Verify story exists
    return this.repository.skip(storyId, reason)
  }

  async retryStory(storyId: string): Promise<Story> {
    await this.getStory(storyId) // Verify story exists
    return this.repository.retry(storyId)
  }
}
