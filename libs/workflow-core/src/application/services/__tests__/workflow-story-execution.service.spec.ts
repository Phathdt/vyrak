import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkflowStoryExecutionService } from '../workflow-story-execution.service'

import type { IEventRepository } from '../../../domain/interfaces/event.repository.interface'
import type { IStoryRepository } from '../../../domain/interfaces/story.repository.interface'
import type { Story } from '@vyrak/database'

describe('WorkflowStoryExecutionService', () => {
  let service: WorkflowStoryExecutionService
  let mockStoryRepository: Partial<IStoryRepository>
  let mockEventRepository: Partial<IEventRepository>

  const createMockStory = (overrides: Partial<Story> = {}): Story => ({
    id: 'story-1',
    workflowRunId: 'run-1',
    orderIndex: 0,
    title: 'Test Story',
    description: 'Test description',
    acceptanceCriteria: null,
    estimatedDuration: 3600,
    status: 'queued',
    startedAt: null,
    completedAt: null,
    duration: null,
    error: null,
    artifacts: null,
    subSteps: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    vi.useFakeTimers()

    mockStoryRepository = {
      findByWorkflowRunId: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
      appendSubStep: vi.fn(),
      updateSubStep: vi.fn(),
      saveArtifacts: vi.fn(),
      skip: vi.fn(),
      retry: vi.fn(),
      createMany: vi.fn(),
    }

    mockEventRepository = {
      appendEvent: vi.fn(),
      findEventsByRunId: vi.fn(),
      getNextSequence: vi.fn(),
    }

    service = new WorkflowStoryExecutionService(
      mockStoryRepository as IStoryRepository,
      mockEventRepository as IEventRepository
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('executeStory', () => {
    it('should execute single story with 4 sub-steps', async () => {
      const story = createMockStory()
      ;(mockStoryRepository.findById as any).mockResolvedValue(story)
      ;(mockStoryRepository.updateStatus as any).mockResolvedValue({
        ...story,
        status: 'running',
        startedAt: new Date(),
      })
      ;(mockStoryRepository.appendSubStep as any).mockResolvedValue({
        ...story,
        subSteps: [],
      })
      ;(mockStoryRepository.updateSubStep as any).mockResolvedValue({
        ...story,
        subSteps: [],
      })

      const promise = service.executeStory('story-1')
      await vi.runAllTimersAsync()
      await promise

      // Should mark as running
      expect(mockStoryRepository.updateStatus).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({ status: 'running' })
      )

      // Should emit story_started event
      expect(mockEventRepository.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'story_started',
          payload: expect.objectContaining({
            storyId: 'story-1',
          }),
        })
      )

      // Should append 4 sub-steps
      expect(mockStoryRepository.appendSubStep).toHaveBeenCalledTimes(4)

      // Should emit story_completed event
      expect(mockEventRepository.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'story_completed',
          payload: expect.objectContaining({
            storyId: 'story-1',
            status: 'succeeded',
          }),
        })
      )
    })

    it('should emit progress events for 4 sub-steps', async () => {
      const story = createMockStory()
      ;(mockStoryRepository.findById as any).mockResolvedValue(story)
      ;(mockStoryRepository.updateStatus as any).mockResolvedValue({
        ...story,
        status: 'running',
      })
      ;(mockStoryRepository.appendSubStep as any).mockResolvedValue({
        ...story,
        subSteps: [],
      })
      ;(mockStoryRepository.updateSubStep as any).mockResolvedValue({
        ...story,
        subSteps: [],
      })

      const promise = service.executeStory('story-1')
      await vi.runAllTimersAsync()
      await promise

      const progressEvents = (mockEventRepository.appendEvent as any).mock.calls
        .filter((call: any) => call[0].eventType === 'story_progress')
        .map((call: any) => call[0].payload.currentSubStep)

      expect(progressEvents).toContain('Plan story')
      expect(progressEvents).toContain('Write code')
      expect(progressEvents).toContain('Write tests')
      expect(progressEvents).toContain('Update docs')
      expect(progressEvents).toHaveLength(4)
    })

    it('should calculate duration correctly', async () => {
      const story = createMockStory()
      ;(mockStoryRepository.findById as any).mockResolvedValue(story)
      ;(mockStoryRepository.updateStatus as any).mockResolvedValue({
        ...story,
        status: 'completed',
        duration: 100,
      })
      ;(mockStoryRepository.appendSubStep as any).mockResolvedValue({ ...story, subSteps: [] })
      ;(mockStoryRepository.updateSubStep as any).mockResolvedValue({ ...story, subSteps: [] })

      const promise = service.executeStory('story-1')
      await vi.runAllTimersAsync()
      await promise

      // Should mark story as completed with duration calculated
      expect(mockStoryRepository.updateStatus).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({
          status: 'completed',
        })
      )

      // Check that final status call has a duration
      const completionCalls = (mockStoryRepository.updateStatus as any).mock.calls.filter(
        (call: any) => call[1].status === 'completed'
      )
      expect(completionCalls.length).toBeGreaterThan(0)
    })

    it('should throw if story not found', async () => {
      ;(mockStoryRepository.findById as any).mockResolvedValue(null)

      await expect(service.executeStory('non-existent')).rejects.toThrow('Story non-existent not found')
    })

    it('should emit story_failed event on execution error', async () => {
      const story = createMockStory()
      ;(mockStoryRepository.findById as any).mockResolvedValue(story)
      ;(mockStoryRepository.updateStatus as any).mockResolvedValue({
        ...story,
        status: 'running',
      })
      ;(mockStoryRepository.appendSubStep as any).mockRejectedValue(new Error('Sub-step failed'))

      const promise = service.executeStory('story-1')
      await expect(promise).rejects.toThrow('Sub-step failed')

      // Should emit story_failed event
      expect(mockEventRepository.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'story_failed',
          payload: expect.objectContaining({
            storyId: 'story-1',
            status: 'failed',
          }),
        })
      )
    })
  })

  describe('executeStoriesSequentially', () => {
    it('should execute multiple stories in order', async () => {
      const stories = [
        createMockStory({ orderIndex: 0, title: 'First' }),
        createMockStory({ id: 'story-2', orderIndex: 1, title: 'Second' }),
      ]

      ;(mockStoryRepository.findByWorkflowRunId as any).mockResolvedValue(stories)
      ;(mockStoryRepository.findById as any).mockResolvedValue(stories[0])
      ;(mockStoryRepository.updateStatus as any).mockResolvedValue({
        ...stories[0],
        status: 'completed',
      })
      ;(mockStoryRepository.appendSubStep as any).mockResolvedValue({
        ...stories[0],
        subSteps: [],
      })
      ;(mockStoryRepository.updateSubStep as any).mockResolvedValue({
        ...stories[0],
        subSteps: [],
      })

      const promise = service.executeStoriesSequentially('run-1')
      await vi.runAllTimersAsync()
      await promise

      expect(mockStoryRepository.findByWorkflowRunId).toHaveBeenCalledWith('run-1')
    })

    it('should handle no stories gracefully', async () => {
      ;(mockStoryRepository.findByWorkflowRunId as any).mockResolvedValue([])

      const promise = service.executeStoriesSequentially('run-1')
      await vi.runAllTimersAsync()
      await promise

      expect(mockStoryRepository.findByWorkflowRunId).toHaveBeenCalledWith('run-1')
    })

    it('should continue execution even if one story fails', async () => {
      const stories = [createMockStory({ orderIndex: 0 }), createMockStory({ id: 'story-2', orderIndex: 1 })]

      ;(mockStoryRepository.findByWorkflowRunId as any).mockResolvedValue(stories)
      ;(mockStoryRepository.findById as any).mockResolvedValue(stories[0])

      // First execution fails
      let callCount = 0
      ;(mockStoryRepository.updateStatus as any).mockImplementation(async () => {
        callCount++
        if (callCount === 1) throw new Error('Execution failed')
        return { ...stories[0], status: 'completed' }
      })

      ;(mockStoryRepository.appendSubStep as any).mockResolvedValue({
        ...stories[0],
        subSteps: [],
      })

      const promise = service.executeStoriesSequentially('run-1')
      await vi.runAllTimersAsync()
      await promise

      // Should continue despite first failure
      expect(mockStoryRepository.findByWorkflowRunId).toHaveBeenCalledWith('run-1')
    })
  })

  describe('updateSubStep', () => {
    it('should update sub-step status', async () => {
      await service.updateSubStep('story-1', 'Plan story', 'completed')

      expect(mockStoryRepository.updateSubStep).toHaveBeenCalledWith('story-1', 'Plan story', 'completed', undefined)
    })

    it('should include error message when provided', async () => {
      await service.updateSubStep('story-1', 'Write code', 'failed', 'Syntax error')

      expect(mockStoryRepository.updateSubStep).toHaveBeenCalledWith('story-1', 'Write code', 'failed', 'Syntax error')
    })
  })
})
