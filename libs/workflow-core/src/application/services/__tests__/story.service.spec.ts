import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { Story } from '@vyrak/database'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  CreateStoryData,
  IStoryRepository,
  SubStepData,
} from '../../../domain/interfaces/story.repository.interface'
import { StoryService } from '../story.service'

describe('StoryService', () => {
  let service: StoryService
  let mockRepository: ReturnType<typeof vi.fn<any, Partial<IStoryRepository>>>

  const createMockStory = (overrides: Partial<Story> = {}): Story => ({
    id: 'story-1',
    workflowRunId: 'run-1',
    orderIndex: 0,
    title: 'Test Story',
    description: 'Test description',
    acceptanceCriteria: { criteria: 'test' },
    estimatedDuration: 3600,
    status: 'queued',
    startedAt: null,
    completedAt: null,
    duration: null,
    error: null,
    artifacts: null,
    subSteps: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    mockRepository = {
      createMany: vi.fn(),
      findByWorkflowRunId: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
      appendSubStep: vi.fn(),
      saveArtifacts: vi.fn(),
      skip: vi.fn(),
      retry: vi.fn(),
      updateSubStep: vi.fn(),
    }

    service = new StoryService(mockRepository as unknown as IStoryRepository)
  })

  describe('createStories', () => {
    it('should create stories with order index for feature template', async () => {
      const mockStories = [
        createMockStory({ orderIndex: 0, title: 'Story 1' }),
        createMockStory({ orderIndex: 1, title: 'Story 2' }),
      ]
      mockRepository.createMany.mockResolvedValue(mockStories)

      const input = {
        workflowRunId: 'run-1',
        templateType: 'feature' as const,
        stories: [
          { title: 'Story 1', description: 'Desc 1' },
          { title: 'Story 2', description: 'Desc 2' },
        ],
      }

      const result = await service.createStories(input)

      expect(result).toEqual(mockStories)
      expect(mockRepository.createMany).toHaveBeenCalled()

      const callArg = (mockRepository.createMany as any).mock.calls[0][0] as CreateStoryData[]
      expect(callArg).toHaveLength(2)
      expect(callArg[0].orderIndex).toBe(0)
      expect(callArg[1].orderIndex).toBe(1)
    })

    it('should create single story for hotfix template', async () => {
      const mockStory = createMockStory({ orderIndex: 0 })
      mockRepository.createMany.mockResolvedValue([mockStory])

      const input = {
        workflowRunId: 'run-1',
        templateType: 'hotfix' as const,
        stories: [{ title: 'Hotfix Story' }],
      }

      const result = await service.createStories(input)

      expect(result).toHaveLength(1)
      expect(result[0].orderIndex).toBe(0)
    })

    it('should allow 1-20 stories for feature template', async () => {
      const stories = Array.from({ length: 20 }, (_, i) => ({
        title: `Story ${i + 1}`,
      }))

      mockRepository.createMany.mockResolvedValue([])

      const input = {
        workflowRunId: 'run-1',
        templateType: 'feature' as const,
        stories,
      }

      await expect(service.createStories(input)).resolves.not.toThrow()
    })

    it('should reject 0 stories for feature template', async () => {
      const input = {
        workflowRunId: 'run-1',
        templateType: 'feature' as const,
        stories: [],
      }

      await expect(service.createStories(input)).rejects.toThrow(BadRequestException)
      await expect(service.createStories(input)).rejects.toThrow('feature workflows must have between 1 and 20 stories')
    })

    it('should reject 21 stories for feature template', async () => {
      const stories = Array.from({ length: 21 }, (_, i) => ({
        title: `Story ${i + 1}`,
      }))

      const input = {
        workflowRunId: 'run-1',
        templateType: 'feature' as const,
        stories,
      }

      await expect(service.createStories(input)).rejects.toThrow(BadRequestException)
      await expect(service.createStories(input)).rejects.toThrow('feature workflows must have between 1 and 20 stories')
    })

    it('should allow 1 story for hotfix template', async () => {
      mockRepository.createMany.mockResolvedValue([createMockStory()])

      const input = {
        workflowRunId: 'run-1',
        templateType: 'hotfix' as const,
        stories: [{ title: 'Hotfix' }],
      }

      await expect(service.createStories(input)).resolves.not.toThrow()
    })

    it('should reject 2 stories for hotfix template', async () => {
      const input = {
        workflowRunId: 'run-1',
        templateType: 'hotfix' as const,
        stories: [{ title: 'Hotfix 1' }, { title: 'Hotfix 2' }],
      }

      await expect(service.createStories(input)).rejects.toThrow(BadRequestException)
      await expect(service.createStories(input)).rejects.toThrow('hotfix workflows must have between 1 and 1 stories')
    })

    it('should reject unknown template type', async () => {
      const input = {
        workflowRunId: 'run-1',
        templateType: 'unknown' as any,
        stories: [{ title: 'Story' }],
      }

      await expect(service.createStories(input)).rejects.toThrow(BadRequestException)
    })
  })

  describe('getStories', () => {
    it('should return stories ordered by orderIndex', async () => {
      const stories = [
        createMockStory({ orderIndex: 0, title: 'First' }),
        createMockStory({ orderIndex: 1, title: 'Second' }),
        createMockStory({ orderIndex: 2, title: 'Third' }),
      ]
      mockRepository.findByWorkflowRunId.mockResolvedValue(stories)

      const result = await service.getStories('run-1')

      expect(result).toEqual(stories)
      expect(result[0].orderIndex).toBe(0)
      expect(result[1].orderIndex).toBe(1)
      expect(result[2].orderIndex).toBe(2)
    })

    it('should return empty array if no stories', async () => {
      mockRepository.findByWorkflowRunId.mockResolvedValue([])

      const result = await service.getStories('run-1')

      expect(result).toEqual([])
    })
  })

  describe('getStory', () => {
    it('should return story by ID when it exists', async () => {
      const story = createMockStory()
      mockRepository.findById.mockResolvedValue(story)

      const result = await service.getStory('story-1')

      expect(result).toEqual(story)
    })

    it('should throw NotFoundException when story not found', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(service.getStory('non-existent')).rejects.toThrow(NotFoundException)
      await expect(service.getStory('non-existent')).rejects.toThrow('Story with ID non-existent not found')
    })
  })

  describe('updateStoryStatus', () => {
    it('should update status to running and set startedAt', async () => {
      const story = createMockStory()
      mockRepository.findById.mockResolvedValue(story)
      mockRepository.updateStatus.mockResolvedValue({
        ...story,
        status: 'running',
        startedAt: new Date(),
      })

      const result = await service.updateStoryStatus('story-1', 'running')

      expect(result.status).toBe('running')
      expect(result.startedAt).toBeDefined()

      const updateCall = (mockRepository.updateStatus as any).mock.calls[0]
      expect(updateCall[1].startedAt).toBeDefined()
    })

    it('should update status to completed and calculate duration', async () => {
      const startedAt = new Date(Date.now() - 3600000) // 1 hour ago
      const story = createMockStory({ startedAt, status: 'running' })
      mockRepository.findById.mockResolvedValue(story)
      const completedAt = new Date()
      mockRepository.updateStatus.mockResolvedValue({
        ...story,
        status: 'completed',
        completedAt,
        duration: 3600,
      })

      const result = await service.updateStoryStatus('story-1', 'completed')

      expect(result.status).toBe('completed')
      expect(result.completedAt).toBeDefined()
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should update status to failed and set completedAt', async () => {
      const startedAt = new Date(Date.now() - 1800000) // 30 min ago
      const story = createMockStory({ startedAt, status: 'running' })
      mockRepository.findById.mockResolvedValue(story)
      mockRepository.updateStatus.mockResolvedValue({
        ...story,
        status: 'failed',
        completedAt: new Date(),
      })

      const result = await service.updateStoryStatus('story-1', 'failed')

      expect(result.status).toBe('failed')
      expect(result.completedAt).toBeDefined()
    })

    it('should not set startedAt if already set', async () => {
      const startedAt = new Date()
      const story = createMockStory({ startedAt })
      mockRepository.findById.mockResolvedValue(story)
      mockRepository.updateStatus.mockResolvedValue({ ...story, status: 'running' })

      await service.updateStoryStatus('story-1', 'running')

      const updateCall = (mockRepository.updateStatus as any).mock.calls[0]
      // Should only have status in the update call if startedAt is already set
      expect(updateCall[1].status).toBe('running')
    })
  })

  describe('updateStoryProgress', () => {
    it('should append sub-step to story', async () => {
      const story = createMockStory()
      mockRepository.findById.mockResolvedValue(story)
      const subStep: SubStepData = { name: 'Plan story', status: 'completed' }
      mockRepository.appendSubStep.mockResolvedValue({
        ...story,
        subSteps: [subStep],
      })

      const result = await service.updateStoryProgress('story-1', subStep)

      expect(mockRepository.appendSubStep).toHaveBeenCalledWith('story-1', subStep)
      expect(result.subSteps).toBeDefined()
    })

    it('should verify story exists before appending', async () => {
      mockRepository.findById.mockResolvedValue(null)

      const subStep: SubStepData = { name: 'Plan story', status: 'completed' }

      await expect(service.updateStoryProgress('story-1', subStep)).rejects.toThrow(NotFoundException)
    })
  })

  describe('saveStoryArtifacts', () => {
    it('should save artifacts to story', async () => {
      const story = createMockStory()
      mockRepository.findById.mockResolvedValue(story)
      const artifacts = { code: 'generated-code', tests: 'test-coverage' }
      mockRepository.saveArtifacts.mockResolvedValue({
        ...story,
        artifacts,
      })

      const result = await service.saveStoryArtifacts('story-1', artifacts)

      expect(mockRepository.saveArtifacts).toHaveBeenCalledWith('story-1', artifacts)
      expect(result.artifacts).toEqual(artifacts)
    })
  })

  describe('skipStory', () => {
    it('should mark story as skipped with reason', async () => {
      const story = createMockStory()
      mockRepository.findById.mockResolvedValue(story)
      mockRepository.skip.mockResolvedValue({
        ...story,
        status: 'skipped',
        error: 'Skipped: Not needed for this run',
      })

      const result = await service.skipStory('story-1', 'Not needed for this run')

      expect(mockRepository.skip).toHaveBeenCalledWith('story-1', 'Not needed for this run')
      expect(result.status).toBe('skipped')
    })
  })

  describe('retryStory', () => {
    it('should reset story to queued status', async () => {
      const story = createMockStory({ status: 'failed', error: 'Some error' })
      mockRepository.findById.mockResolvedValue(story)
      mockRepository.retry.mockResolvedValue({
        ...story,
        status: 'queued',
        error: null,
      })

      const result = await service.retryStory('story-1')

      expect(mockRepository.retry).toHaveBeenCalledWith('story-1')
      expect(result.status).toBe('queued')
      expect(result.error).toBeNull()
    })

    it('should verify story exists before retrying', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(service.retryStory('story-1')).rejects.toThrow(NotFoundException)
    })
  })
})
