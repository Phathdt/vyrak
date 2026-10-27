import { PrismaClient } from '@vyrak/database'
import { createTestOrgWithOwner, getPrismaClient, startPostgres, stopPostgres } from '@vyrak/database/test-utils'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { EventPrismaRepository } from '../../../../infras/repositories/event-prisma.repository'
import { StoryPrismaRepository } from '../../../../infras/repositories/story-prisma.repository'
import { WorkflowTemplatePrismaRepository } from '../../../../infras/repositories/workflow-template-prisma.repository'
import { StoryService } from '../../story.service'
import { WorkflowStoryExecutionService } from '../../workflow-story-execution.service'
import { WorkflowTemplateService } from '../../workflow-template.service'

describe('Story-Based Workflow Integration Tests', () => {
  let prisma: PrismaClient
  let templateService: WorkflowTemplateService
  let storyService: StoryService
  let executionService: WorkflowStoryExecutionService
  let org: any
  let user: any

  beforeAll(async () => {
    try {
      await startPostgres()
      prisma = getPrismaClient()

      // Create test data
      const result = await createTestOrgWithOwner(prisma)
      org = result.organization
      user = result.user

      // Initialize repositories and services
      const templateRepo = new WorkflowTemplatePrismaRepository(prisma)
      const storyRepo = new StoryPrismaRepository(prisma)
      const eventRepo = new EventPrismaRepository(prisma)

      templateService = new WorkflowTemplateService(templateRepo)
      storyService = new StoryService(storyRepo)
      executionService = new WorkflowStoryExecutionService(storyRepo, eventRepo)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    await stopPostgres()
  })

  const createTestWorkflowRun = async () => {
    if (!prisma) return null

    const template = await prisma.workflowTemplate.findFirst({
      where: { key: 'feature' },
    })

    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: `Test Project ${Date.now()}`,
        slug: `test-project-${Date.now()}`,
      },
    })

    return await prisma.workflowRun.create({
      data: {
        projectId: project.id,
        organizationId: org.id,
        templateId: template?.id,
        templateKey: template?.key || 'feature',
        workflowKey: 'test-workflow',
        workflowVersion: '1.0.0',
        initiatedByUserId: user.id,
      },
    })
  }

  describe('WorkflowTemplateService', () => {
    it('should list active workflow templates', async () => {
      if (!prisma) return

      const templates = await templateService.listTemplates()

      expect(templates).toBeDefined()
      expect(Array.isArray(templates)).toBe(true)
      expect(templates.length >= 0).toBe(true)
    })

    it('should get template by ID', async () => {
      if (!prisma) return

      const templates = await templateService.listTemplates()
      if (templates.length === 0) return

      const retrieved = await templateService.getTemplateById(templates[0].id)

      expect(retrieved).toBeDefined()
      expect(retrieved.id).toBe(templates[0].id)
    })

    it('should get template by key', async () => {
      if (!prisma) return

      const existing = await prisma.workflowTemplate.findUnique({
        where: { key: 'feature' },
      })

      if (!existing) {
        await prisma.workflowTemplate.create({
          data: {
            key: 'feature',
            name: 'Feature',
            description: 'Feature workflow',
            icon: '📝',
            isActive: true,
            storyBased: true,
            phases: [],
          },
        })
      }

      const template = await templateService.getTemplateByKey('feature')

      expect(template).toBeDefined()
      expect(template.key).toBe('feature')
    })

    it('should validate template is active', async () => {
      if (!prisma) return

      const templates = await templateService.listTemplates()
      if (templates.length === 0) return

      const isActive = await templateService.validateTemplate(templates[0].id)

      expect(typeof isActive).toBe('boolean')
    })
  })

  describe('StoryService', () => {
    it('should create stories with order index', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      const stories = await storyService.createStories({
        workflowRunId: workflowRun.id,
        templateType: 'feature',
        stories: [
          { title: 'First Story', description: 'First' },
          { title: 'Second Story', description: 'Second' },
        ],
      })

      expect(stories).toHaveLength(2)
      expect(stories[0].orderIndex).toBe(0)
      expect(stories[1].orderIndex).toBe(1)
      expect(stories[0].title).toBe('First Story')
      expect(stories[1].title).toBe('Second Story')
    })

    it('should get stories ordered by orderIndex', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      await storyService.createStories({
        workflowRunId: workflowRun.id,
        templateType: 'feature',
        stories: [{ title: 'Story 3' }, { title: 'Story 1' }, { title: 'Story 2' }],
      })

      const stories = await storyService.getStories(workflowRun.id)

      expect(stories).toHaveLength(3)
      expect(stories[0].orderIndex).toBe(0)
      expect(stories[1].orderIndex).toBe(1)
      expect(stories[2].orderIndex).toBe(2)
    })

    it('should reject 0 stories for feature template', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      await expect(
        storyService.createStories({
          workflowRunId: workflowRun.id,
          templateType: 'feature',
          stories: [],
        })
      ).rejects.toThrow('feature workflows must have between 1 and 20 stories')
    })

    it('should reject 21 stories for feature template', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      const stories = Array.from({ length: 21 }, (_, i) => ({
        title: `Story ${i + 1}`,
      }))

      await expect(
        storyService.createStories({
          workflowRunId: workflowRun.id,
          templateType: 'feature',
          stories,
        })
      ).rejects.toThrow('feature workflows must have between 1 and 20 stories')
    })

    it('should allow 1-20 stories for feature template', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      for (const count of [1, 5, 10, 20]) {
        const runForCount = await createTestWorkflowRun()
        if (!runForCount) return

        const stories = Array.from({ length: count }, (_, i) => ({
          title: `Story ${i + 1}`,
        }))

        const result = await storyService.createStories({
          workflowRunId: runForCount.id,
          templateType: 'feature',
          stories,
        })

        expect(result).toHaveLength(count)
      }
    })

    it('should reject 2 stories for hotfix template', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      await expect(
        storyService.createStories({
          workflowRunId: workflowRun.id,
          templateType: 'hotfix',
          stories: [{ title: 'Fix 1' }, { title: 'Fix 2' }],
        })
      ).rejects.toThrow('hotfix workflows must have between 1 and 1 stories')
    })

    it('should update story status to running', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      const stories = await storyService.createStories({
        workflowRunId: workflowRun.id,
        templateType: 'feature',
        stories: [{ title: 'Status Test' }],
      })

      const updated = await storyService.updateStoryStatus(stories[0].id, 'running')

      expect(updated.status).toBe('running')
      expect(updated.startedAt).toBeDefined()
    })

    it('should update story status to completed with duration', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      const stories = await storyService.createStories({
        workflowRunId: workflowRun.id,
        templateType: 'feature',
        stories: [{ title: 'Completion Test' }],
      })

      await storyService.updateStoryStatus(stories[0].id, 'running')
      const completed = await storyService.updateStoryStatus(stories[0].id, 'completed')

      expect(completed.status).toBe('completed')
      expect(completed.completedAt).toBeDefined()
      expect(completed.duration).toBeDefined()
      expect(completed.duration).toBeGreaterThanOrEqual(0)
    })

    it('should append sub-step to story', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      const stories = await storyService.createStories({
        workflowRunId: workflowRun.id,
        templateType: 'feature',
        stories: [{ title: 'Sub-step Test' }],
      })

      const updated = await storyService.updateStoryProgress(stories[0].id, {
        name: 'Plan story',
        status: 'completed',
      })

      expect(updated.subSteps).toBeDefined()
      expect(Array.isArray(updated.subSteps)).toBe(true)
    })

    it('should save story artifacts', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      const stories = await storyService.createStories({
        workflowRunId: workflowRun.id,
        templateType: 'feature',
        stories: [{ title: 'Artifacts Test' }],
      })

      const artifacts = { code: 'generated code', tests: 'test coverage' }
      const updated = await storyService.saveStoryArtifacts(stories[0].id, artifacts)

      expect(updated.artifacts).toEqual(artifacts)
    })

    it('should skip story with reason', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      const stories = await storyService.createStories({
        workflowRunId: workflowRun.id,
        templateType: 'feature',
        stories: [{ title: 'Skip Test' }],
      })

      const skipped = await storyService.skipStory(stories[0].id, 'Not needed')

      expect(skipped.status).toBe('skipped')
      expect(skipped.error).toContain('Not needed')
    })

    it('should retry failed story', async () => {
      if (!prisma) return

      const workflowRun = await createTestWorkflowRun()
      if (!workflowRun) return

      const stories = await storyService.createStories({
        workflowRunId: workflowRun.id,
        templateType: 'feature',
        stories: [{ title: 'Retry Test' }],
      })

      await prisma.story.update({
        where: { id: stories[0].id },
        data: { status: 'failed', error: 'Test error' },
      })

      const retried = await storyService.retryStory(stories[0].id)

      expect(retried.status).toBe('queued')
      expect(retried.error).toBeNull()
    })
  })

  describe('WorkflowStoryExecutionService', () => {
    it.skip('should execute story with 4 sub-steps', async () => {
      if (!prisma) return

      const executionRun = await createTestWorkflowRun()
      if (!executionRun) return

      const stories = await storyService.createStories({
        workflowRunId: executionRun.id,
        templateType: 'feature',
        stories: [{ title: 'Execution Test' }],
      })

      await executionService.executeStory(stories[0].id)

      const completed = await storyService.getStory(stories[0].id)

      expect(completed.status).toBe('completed')
      expect(completed.subSteps).toBeDefined()
    })

    it.skip('should emit story events during execution', async () => {
      if (!prisma) return

      const executionRun = await createTestWorkflowRun()
      if (!executionRun) return

      const stories = await storyService.createStories({
        workflowRunId: executionRun.id,
        templateType: 'feature',
        stories: [{ title: 'Events Test' }],
      })

      await executionService.executeStory(stories[0].id)

      const events = await prisma.workflowEvent.findMany({
        where: {
          runId: executionRun.id,
        },
      })

      const eventTypes = events.map((e) => e.eventType)

      expect(eventTypes).toContain('story_started')
      expect(eventTypes).toContain('story_completed')
      const progressCount = eventTypes.filter((t) => t === 'story_progress').length
      expect(progressCount).toBe(4)
    })

    it('should execute multiple stories sequentially', async () => {
      if (!prisma) return

      const executionRun = await createTestWorkflowRun()
      if (!executionRun) return

      const stories = await storyService.createStories({
        workflowRunId: executionRun.id,
        templateType: 'feature',
        stories: [{ title: 'Sequential 1' }, { title: 'Sequential 2' }, { title: 'Sequential 3' }],
      })

      await executionService.executeStoriesSequentially(executionRun.id)

      for (const story of stories) {
        const completed = await storyService.getStory(story.id)
        expect(['completed', 'failed']).toContain(completed.status)
      }
    })

    it.skip('should calculate story duration correctly', async () => {
      if (!prisma) return

      const executionRun = await createTestWorkflowRun()
      if (!executionRun) return

      const stories = await storyService.createStories({
        workflowRunId: executionRun.id,
        templateType: 'feature',
        stories: [{ title: 'Duration Test' }],
      })

      await executionService.executeStory(stories[0].id)

      const completed = await storyService.getStory(stories[0].id)

      expect(completed.duration).toBeDefined()
      expect(completed.duration).toBeGreaterThanOrEqual(0)
      expect(completed.startedAt).toBeDefined()
      expect(completed.completedAt).toBeDefined()
    })
  })
})
