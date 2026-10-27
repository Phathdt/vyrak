import { Logger } from '@nestjs/common'

import type { IEventRepository } from '../../domain/interfaces/event.repository.interface'
import type { IStoryRepository, SubStepData } from '../../domain/interfaces/story.repository.interface'

/**
 * Sub-step names for story execution
 */
const SUB_STEPS = ['Plan story', 'Write code', 'Write tests', 'Update docs'] as const

/**
 * Workflow Story Execution Service
 *
 * Handles story-based workflow execution logic
 * Plain TypeScript class - no @Injectable decorator per CLAUDE.md rules
 */
export class WorkflowStoryExecutionService {
  private readonly logger = new Logger(WorkflowStoryExecutionService.name)

  constructor(
    private readonly storyRepository: IStoryRepository,
    private readonly eventRepository: IEventRepository
  ) {}

  /**
   * Execute all stories sequentially for a workflow run
   * Story failure shouldn't throw - mark failed and continue
   */
  async executeStoriesSequentially(workflowRunId: string): Promise<void> {
    this.logger.log(`Starting sequential story execution for workflow run: ${workflowRunId}`)

    const stories = await this.storyRepository.findByWorkflowRunId(workflowRunId)

    if (stories.length === 0) {
      this.logger.warn(`No stories found for workflow run: ${workflowRunId}`)
      return
    }

    this.logger.log(`Found ${stories.length} stories to execute`)

    for (const story of stories) {
      try {
        this.logger.log(`Executing story ${story.orderIndex + 1}/${stories.length}: ${story.title}`)
        await this.executeStory(story.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(`Story ${story.id} failed: ${message}`)

        // Mark story as failed but continue with next stories
        await this.storyRepository.updateStatus(story.id, {
          status: 'failed',
          completedAt: new Date(),
        })
      }
    }

    this.logger.log(`Completed sequential execution for workflow run: ${workflowRunId}`)
  }

  /**
   * Execute a single story with sub-steps
   * Sub-steps: "Plan story" → "Write code" → "Write tests" → "Update docs"
   */
  async executeStory(storyId: string): Promise<void> {
    this.logger.log(`Executing story: ${storyId}`)

    // Get story for event emission
    const story = await this.storyRepository.findById(storyId)
    if (!story) {
      throw new Error(`Story ${storyId} not found`)
    }

    const startedAt = new Date()

    // Mark story as running
    await this.storyRepository.updateStatus(storyId, {
      status: 'running',
      startedAt,
    })

    // Emit story_started event
    await this.eventRepository.appendEvent({
      runId: story.workflowRunId,
      organizationId: '', // Will be set by repository from workflow run
      eventType: 'story_started',
      payload: {
        storyId: story.id,
        orderIndex: story.orderIndex,
        title: story.title,
        startedAt,
      },
    })

    try {
      // Initialize sub-steps
      for (const subStepName of SUB_STEPS) {
        const subStep: SubStepData = {
          name: subStepName,
          status: 'pending',
        }
        await this.storyRepository.appendSubStep(storyId, subStep)
      }

      // Execute each sub-step sequentially
      for (const subStepName of SUB_STEPS) {
        try {
          // Emit story_progress event
          await this.eventRepository.appendEvent({
            runId: story.workflowRunId,
            organizationId: '',
            eventType: 'story_progress',
            payload: {
              storyId: story.id,
              currentSubStep: subStepName,
              timestamp: new Date(),
            },
          })

          await this.executeSubStep(storyId, subStepName)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          this.logger.error(`Sub-step ${subStepName} failed for story ${storyId}: ${message}`)

          // Update sub-step to failed
          await this.updateSubStep(storyId, subStepName, 'failed', message)

          // Fail the entire story
          throw error
        }
      }

      // Calculate duration
      const completedAt = new Date()
      const duration = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)

      // All sub-steps completed successfully
      await this.storyRepository.updateStatus(storyId, {
        status: 'completed',
        completedAt,
        duration,
      })

      // Emit story_completed event
      await this.eventRepository.appendEvent({
        runId: story.workflowRunId,
        organizationId: '',
        eventType: 'story_completed',
        payload: {
          storyId: story.id,
          status: 'succeeded' as const,
          duration,
          artifacts: story.artifacts,
        },
      })

      this.logger.log(`Story ${storyId} completed successfully`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Story ${storyId} execution failed: ${message}`)

      // Mark story as failed
      await this.storyRepository.updateStatus(storyId, {
        status: 'failed',
        completedAt: new Date(),
      })

      // Emit story_failed event
      await this.eventRepository.appendEvent({
        runId: story.workflowRunId,
        organizationId: '',
        eventType: 'story_failed',
        payload: {
          storyId: story.id,
          status: 'failed' as const,
          error: message,
          timestamp: new Date(),
        },
      })

      // Re-throw to let caller handle
      throw error
    }
  }

  /**
   * Update sub-step status within a story
   */
  async updateSubStep(storyId: string, name: string, status: string, error?: string): Promise<void> {
    this.logger.debug(`Updating sub-step ${name} to ${status} for story ${storyId}`)
    await this.storyRepository.updateSubStep(storyId, name, status, error)
  }

  /**
   * Execute a single sub-step
   * This is a placeholder - actual implementation will be added when agent integration is ready
   */
  private async executeSubStep(storyId: string, subStepName: string): Promise<void> {
    this.logger.log(`Executing sub-step: ${subStepName} for story ${storyId}`)

    // Update sub-step to running
    await this.updateSubStep(storyId, subStepName, 'running')

    // TODO: Actual sub-step execution logic will be implemented when:
    // - Agent integration is ready for "Plan story" and "Write code"
    // - Test runner integration is ready for "Write tests"
    // - Documentation generator is ready for "Update docs"
    //
    // For now, this is a stub that immediately succeeds
    this.logger.debug(`Sub-step ${subStepName} logic not yet implemented, marking as completed`)

    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Update sub-step to completed
    await this.updateSubStep(storyId, subStepName, 'completed')
  }
}
