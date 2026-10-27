import { describe, expect, it } from 'vitest'

import {
  isStoryCompletedPayload,
  isStoryFailedPayload,
  isStoryProgressPayload,
  isStoryStartedPayload,
  StoryCompletedPayloadSchema,
  StoryFailedPayloadSchema,
  StoryProgressPayloadSchema,
  StoryStartedPayloadSchema,
  WorkflowEventType,
} from '../workflow-events'

describe('Story SSE Events', () => {
  describe('StoryStartedPayload', () => {
    it('should validate correct story_started payload', () => {
      const payload = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        orderIndex: 0,
        title: 'Implement user authentication',
        startedAt: new Date(),
      }

      const result = StoryStartedPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
      expect(isStoryStartedPayload(payload)).toBe(true)
    })

    it('should reject invalid story_started payload', () => {
      const payload = {
        storyId: 'not-a-uuid',
        orderIndex: -1,
        title: '',
        startedAt: new Date(),
      }

      const result = StoryStartedPayloadSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('StoryProgressPayload', () => {
    it('should validate correct story_progress payload', () => {
      const payload = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        currentSubStep: 'Plan story',
        timestamp: new Date(),
      }

      const result = StoryProgressPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
      expect(isStoryProgressPayload(payload)).toBe(true)
    })

    it('should accept all valid sub-step names', () => {
      const subSteps = ['Plan story', 'Write code', 'Write tests', 'Update docs']
      const storyId = '123e4567-e89b-12d3-a456-426614174000'

      subSteps.forEach((subStep) => {
        const payload = {
          storyId,
          currentSubStep: subStep,
          timestamp: new Date(),
        }

        const result = StoryProgressPayloadSchema.safeParse(payload)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('StoryCompletedPayload', () => {
    it('should validate correct story_completed payload', () => {
      const payload = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'succeeded' as const,
        duration: 120,
        artifacts: { files: ['main.ts', 'test.spec.ts'] },
      }

      const result = StoryCompletedPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
      expect(isStoryCompletedPayload(payload)).toBe(true)
    })

    it('should accept payload without artifacts', () => {
      const payload = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'succeeded' as const,
        duration: 120,
      }

      const result = StoryCompletedPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const payload = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'failed',
        duration: 120,
      }

      const result = StoryCompletedPayloadSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('StoryFailedPayload', () => {
    it('should validate correct story_failed payload', () => {
      const payload = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'failed' as const,
        error: 'Test execution failed',
        timestamp: new Date(),
      }

      const result = StoryFailedPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
      expect(isStoryFailedPayload(payload)).toBe(true)
    })

    it('should reject invalid status', () => {
      const payload = {
        storyId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'succeeded',
        error: 'Test execution failed',
        timestamp: new Date(),
      }

      const result = StoryFailedPayloadSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('WorkflowEventType', () => {
    it('should include story event types', () => {
      expect(WorkflowEventType.STORY_STARTED).toBe('story_started')
      expect(WorkflowEventType.STORY_PROGRESS).toBe('story_progress')
      expect(WorkflowEventType.STORY_COMPLETED).toBe('story_completed')
      expect(WorkflowEventType.STORY_FAILED).toBe('story_failed')
    })
  })
})
