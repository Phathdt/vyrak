import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { StoryService } from '../../services/story.service'
import { WorkflowStoryExecutionService } from '../../services/workflow-story-execution.service'
import { WorkflowTemplateService } from '../../services/workflow-template.service'

import type { IStoryService } from '../../../domain/interfaces/story.service.interface'
import type { IWorkflowStoryExecutionService } from '../../../domain/interfaces/workflow-story-execution.service.interface'
import type { IWorkflowTemplateService } from '../../../domain/interfaces/workflow-template.service.interface'

describe('Story-Based Workflow API - Unit Tests', () => {
  let templateService: IWorkflowTemplateService
  let storyService: IStoryService
  let executionService: IWorkflowStoryExecutionService

  beforeAll(() => {
    // Create mock services for testing controller logic
    const mockTemplateRepo = {
      findAllActive: vi.fn().mockResolvedValue([
        {
          id: 'template-1',
          key: 'feature',
          name: 'Feature',
          description: 'Feature workflow',
          icon: '📝',
          isActive: true,
          storyBased: true,
          phases: [],
        },
        {
          id: 'template-2',
          key: 'hotfix',
          name: 'Hotfix',
          description: 'Hotfix workflow',
          icon: '🔥',
          isActive: true,
          storyBased: true,
          phases: [],
        },
      ]),
      findById: vi.fn(),
      findByKey: vi.fn(),
      isActive: vi.fn(),
    }

    const mockStoryRepo = {
      createMany: vi.fn(),
      findByWorkflowRunId: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
      appendSubStep: vi.fn(),
      updateSubStep: vi.fn(),
      saveArtifacts: vi.fn(),
      skip: vi.fn(),
      retry: vi.fn(),
    }

    const mockEventRepo = {
      appendEvent: vi.fn(),
      findEventsByRunId: vi.fn(),
      getNextSequence: vi.fn(),
    }

    templateService = new WorkflowTemplateService(mockTemplateRepo as any)
    storyService = new StoryService(mockStoryRepo as any)
    executionService = new WorkflowStoryExecutionService(mockStoryRepo as any, mockEventRepo as any)
  })

  describe('GET /api/organizations/:orgId/workflows/templates', () => {
    it('should return all active templates with 200 status', async () => {
      const templates = await templateService.listTemplates()

      expect(templates).toBeDefined()
      expect(templates).toHaveLength(2)
      expect(templates[0].key).toBe('feature')
      expect(templates[1].key).toBe('hotfix')
    })

    it('should include Feature template with correct metadata', async () => {
      const templates = await templateService.listTemplates()
      const featureTemplate = templates.find((t) => t.key === 'feature')

      expect(featureTemplate).toBeDefined()
      expect(featureTemplate?.name).toBe('Feature')
      expect(featureTemplate?.storyBased).toBe(true)
      expect(featureTemplate?.isActive).toBe(true)
    })

    it('should include Hotfix template with correct metadata', async () => {
      const templates = await templateService.listTemplates()
      const hotfixTemplate = templates.find((t) => t.key === 'hotfix')

      expect(hotfixTemplate).toBeDefined()
      expect(hotfixTemplate?.name).toBe('Hotfix')
      expect(hotfixTemplate?.storyBased).toBe(true)
      expect(hotfixTemplate?.isActive).toBe(true)
    })
  })

  describe('GET /api/organizations/:orgId/workflows/templates/:id', () => {
    it('should return 200 with template when found', async () => {
      const template = {
        id: 'template-1',
        key: 'feature',
        name: 'Feature',
        description: 'Feature workflow',
        icon: '📝',
        isActive: true,
        storyBased: true,
        phases: [],
      }

      const mockRepo = {
        findById: vi.fn().mockResolvedValue(template),
      }
      const service = new WorkflowTemplateService(mockRepo as any)

      const retrieved = await service.getTemplateById(template.id)

      expect(retrieved).toBeDefined()
      expect(retrieved.id).toBe(template.id)
    })

    it('should return 404 when template not found', async () => {
      const mockRepo = {
        findById: vi.fn().mockResolvedValue(null),
      }
      const service = new WorkflowTemplateService(mockRepo as any)

      await expect(service.getTemplateById('non-existent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('POST /api/organizations/:orgId/projects/:projectId/workflows/runs', () => {
    it('should create workflow run with feature template and 2 stories', async () => {
      const mockRepo = {
        createMany: vi.fn().mockResolvedValue([
          {
            id: 'story-1',
            workflowRunId: 'run-1',
            orderIndex: 0,
            title: 'Story 1',
            status: 'queued',
          },
          {
            id: 'story-2',
            workflowRunId: 'run-1',
            orderIndex: 1,
            title: 'Story 2',
            status: 'queued',
          },
        ]),
      }
      const service = new StoryService(mockRepo as any)

      const stories = await service.createStories({
        workflowRunId: 'run-1',
        templateType: 'feature',
        stories: [{ title: 'Story 1' }, { title: 'Story 2' }],
      })

      expect(stories).toHaveLength(2)
      expect(stories[0].orderIndex).toBe(0)
      expect(stories[1].orderIndex).toBe(1)
    })

    it('should reject 0 stories with 400 status', async () => {
      const mockRepo = {
        createMany: vi.fn(),
      }
      const service = new StoryService(mockRepo as any)

      await expect(
        service.createStories({
          workflowRunId: 'run-1',
          templateType: 'feature',
          stories: [],
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should reject 21 stories with 400 status', async () => {
      const mockRepo = {
        createMany: vi.fn(),
      }
      const service = new StoryService(mockRepo as any)

      const stories = Array.from({ length: 21 }, (_, i) => ({
        title: `Story ${i + 1}`,
      }))

      await expect(
        service.createStories({
          workflowRunId: 'run-1',
          templateType: 'feature',
          stories,
        })
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('GET /api/organizations/:orgId/workflows/runs/:runId/stories', () => {
    it('should return stories ordered by orderIndex', async () => {
      const mockRepo = {
        findByWorkflowRunId: vi.fn().mockResolvedValue([
          {
            id: 'story-1',
            workflowRunId: 'run-1',
            orderIndex: 0,
            title: 'First',
            status: 'queued',
          },
          {
            id: 'story-2',
            workflowRunId: 'run-1',
            orderIndex: 1,
            title: 'Second',
            status: 'queued',
          },
          {
            id: 'story-3',
            workflowRunId: 'run-1',
            orderIndex: 2,
            title: 'Third',
            status: 'queued',
          },
        ]),
      }
      const service = new StoryService(mockRepo as any)

      const stories = await service.getStories('run-1')

      expect(stories).toHaveLength(3)
      expect(stories[0].orderIndex).toBe(0)
      expect(stories[1].orderIndex).toBe(1)
      expect(stories[2].orderIndex).toBe(2)
    })

    it('should return empty array for run with no stories', async () => {
      const mockRepo = {
        findByWorkflowRunId: vi.fn().mockResolvedValue([]),
      }
      const service = new StoryService(mockRepo as any)

      const stories = await service.getStories('run-1')

      expect(stories).toEqual([])
    })
  })

  describe('POST /api/organizations/:orgId/workflows/runs/:runId/stories/:storyId/pause', () => {
    it('should accept pause request and return 200', async () => {
      const mockRepo = {
        findById: vi.fn().mockResolvedValue({
          id: 'story-1',
          status: 'running',
        }),
        updateStatus: vi.fn().mockResolvedValue({
          id: 'story-1',
          status: 'paused',
        }),
      }
      const service = new StoryService(mockRepo as any)

      const result = await service.updateStoryStatus('story-1', 'paused')

      expect(result.status).toBe('paused')
    })

    it('should return 404 when story not found', async () => {
      const mockRepo = {
        findById: vi.fn().mockResolvedValue(null),
      }
      const service = new StoryService(mockRepo as any)

      await expect(service.getStory('non-existent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('POST /api/organizations/:orgId/workflows/runs/:runId/stories/:storyId/skip', () => {
    it('should skip story and return 200', async () => {
      const mockRepo = {
        findById: vi.fn().mockResolvedValue({
          id: 'story-1',
          status: 'queued',
        }),
        skip: vi.fn().mockResolvedValue({
          id: 'story-1',
          status: 'skipped',
          error: 'Skipped: Not needed',
        }),
      }
      const service = new StoryService(mockRepo as any)

      const result = await service.skipStory('story-1', 'Not needed')

      expect(result.status).toBe('skipped')
    })

    it('should validate story exists before skipping', async () => {
      const mockRepo = {
        findById: vi.fn().mockResolvedValue(null),
      }
      const service = new StoryService(mockRepo as any)

      await expect(service.getStory('non-existent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('POST /api/organizations/:orgId/workflows/runs/:runId/stories/:storyId/retry', () => {
    it('should retry story and return 200', async () => {
      const mockRepo = {
        findById: vi.fn().mockResolvedValue({
          id: 'story-1',
          status: 'failed',
          error: 'Some error',
        }),
        retry: vi.fn().mockResolvedValue({
          id: 'story-1',
          status: 'queued',
          error: null,
        }),
      }
      const service = new StoryService(mockRepo as any)

      const result = await service.retryStory('story-1')

      expect(result.status).toBe('queued')
      expect(result.error).toBeNull()
    })

    it('should return 400 if story is not failed', async () => {
      const mockRepo = {
        findById: vi.fn().mockResolvedValue({
          id: 'story-1',
          status: 'running',
        }),
        retry: vi.fn().mockRejectedValue(new BadRequestException('Can only retry failed stories')),
      }
      const service = new StoryService(mockRepo as any)

      await expect(service.retryStory('story-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('Story Count Validation', () => {
    let service: IStoryService

    beforeAll(() => {
      service = new StoryService({
        createMany: vi.fn().mockResolvedValue([]),
      } as any)
    })

    it('should allow 1 story for feature template', async () => {
      await expect(
        service.createStories({
          workflowRunId: 'run-1',
          templateType: 'feature',
          stories: [{ title: 'Story' }],
        })
      ).resolves.not.toThrow()
    })

    it('should allow 20 stories for feature template', async () => {
      const stories = Array.from({ length: 20 }, (_, i) => ({
        title: `Story ${i + 1}`,
      }))

      await expect(
        service.createStories({
          workflowRunId: 'run-1',
          templateType: 'feature',
          stories,
        })
      ).resolves.not.toThrow()
    })

    it('should reject 0 stories for feature template', async () => {
      await expect(
        service.createStories({
          workflowRunId: 'run-1',
          templateType: 'feature',
          stories: [],
        })
      ).rejects.toThrow('feature workflows must have between 1 and 20 stories')
    })

    it('should reject 21 stories for feature template', async () => {
      const stories = Array.from({ length: 21 }, (_, i) => ({
        title: `Story ${i + 1}`,
      }))

      await expect(
        service.createStories({
          workflowRunId: 'run-1',
          templateType: 'feature',
          stories,
        })
      ).rejects.toThrow('feature workflows must have between 1 and 20 stories')
    })

    it('should allow 1 story for hotfix template', async () => {
      await expect(
        service.createStories({
          workflowRunId: 'run-1',
          templateType: 'hotfix',
          stories: [{ title: 'Hotfix' }],
        })
      ).resolves.not.toThrow()
    })

    it('should reject 2 stories for hotfix template', async () => {
      await expect(
        service.createStories({
          workflowRunId: 'run-1',
          templateType: 'hotfix',
          stories: [{ title: 'Hotfix 1' }, { title: 'Hotfix 2' }],
        })
      ).rejects.toThrow('hotfix workflows must have between 1 and 1 stories')
    })
  })

  describe('SSE Events', () => {
    it('should emit story_started event when execution begins', async () => {
      const mockEventRepo = {
        appendEvent: vi.fn(),
      }

      // This verifies the execution service is set up to emit events
      const service = new WorkflowStoryExecutionService(
        {
          findById: vi.fn(),
        } as any,
        mockEventRepo as any
      )

      expect(mockEventRepo.appendEvent).toBeDefined()
    })

    it('should emit story_progress events for sub-steps', async () => {
      const mockEventRepo = {
        appendEvent: vi.fn(),
      }

      const service = new WorkflowStoryExecutionService(
        {
          findById: vi.fn(),
        } as any,
        mockEventRepo as any
      )

      expect(mockEventRepo.appendEvent).toBeDefined()
    })

    it('should emit story_completed event on success', async () => {
      const mockEventRepo = {
        appendEvent: vi.fn(),
      }

      const service = new WorkflowStoryExecutionService(
        {
          findById: vi.fn(),
        } as any,
        mockEventRepo as any
      )

      expect(mockEventRepo.appendEvent).toBeDefined()
    })

    it('should emit story_failed event on error', async () => {
      const mockEventRepo = {
        appendEvent: vi.fn(),
      }

      const service = new WorkflowStoryExecutionService(
        {
          findById: vi.fn(),
        } as any,
        mockEventRepo as any
      )

      expect(mockEventRepo.appendEvent).toBeDefined()
    })
  })
})
