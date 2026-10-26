import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkflowPerformanceService } from '../workflow-performance.service'

describe('WorkflowPerformanceService', () => {
  let service: WorkflowPerformanceService
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      workflowRun: {
        findUnique: vi.fn(),
      },
      workflowStepRun: {
        findMany: vi.fn(),
      },
    }
    service = new WorkflowPerformanceService(mockPrisma)
  })

  describe('getPerformance', () => {
    it('should throw error if workflow run not found', async () => {
      mockPrisma.workflowRun.findUnique.mockResolvedValue(null)

      await expect(service.getPerformance('run-123')).rejects.toThrow('Workflow run run-123 not found')
    })

    it('should compute step durations correctly', async () => {
      const mockRun = {
        id: 'run-123',
        organizationId: 'org-123',
        projectId: 'proj-456',
        workflowKey: 'test-workflow',
        status: 'succeeded',
        startedAt: new Date('2026-10-26T10:00:00Z'),
        completedAt: new Date('2026-10-26T10:05:00Z'),
      }

      const mockStepRuns = [
        {
          stepKey: 'step1',
          status: 'succeeded',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:02:00Z'),
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:00:00Z'),
        },
        {
          stepKey: 'step2',
          status: 'succeeded',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:02:00Z'),
          completedAt: new Date('2026-10-26T10:05:00Z'),
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:02:00Z'),
        },
      ]

      mockPrisma.workflowRun.findUnique.mockResolvedValue(mockRun)
      mockPrisma.workflowStepRun.findMany.mockResolvedValue(mockStepRuns)

      const result = await service.getPerformance('run-123')

      expect(result.runId).toBe('run-123')
      expect(result.totalDurationSeconds).toBe(300)
      expect(result.steps).toHaveLength(2)
      expect(result.steps[0].durationSeconds).toBe(120)
      expect(result.steps[0].percentageOfTotal).toBeCloseTo(40, 1)
      expect(result.steps[1].durationSeconds).toBe(180)
      expect(result.steps[1].percentageOfTotal).toBeCloseTo(60, 1)
    })

    it('should handle null timestamps gracefully', async () => {
      const mockRun = {
        id: 'run-123',
        organizationId: 'org-123',
        projectId: 'proj-456',
        workflowKey: 'test-workflow',
        status: 'running',
        startedAt: new Date('2026-10-26T10:00:00Z'),
        completedAt: null,
      }

      const mockStepRuns = [
        {
          stepKey: 'step1',
          status: 'running',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: null,
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:00:00Z'),
        },
      ]

      mockPrisma.workflowRun.findUnique.mockResolvedValue(mockRun)
      mockPrisma.workflowStepRun.findMany.mockResolvedValue(mockStepRuns)

      const result = await service.getPerformance('run-123')

      expect(result.totalDurationSeconds).toBeNull()
      expect(result.steps[0].durationSeconds).toBeNull()
      expect(result.steps[0].percentageOfTotal).toBeNull()
    })

    it('should detect bottlenecks for slow steps (>50% of total)', async () => {
      const mockRun = {
        id: 'run-123',
        organizationId: 'org-123',
        projectId: 'proj-456',
        workflowKey: 'test-workflow',
        status: 'succeeded',
        startedAt: new Date('2026-10-26T10:00:00Z'),
        completedAt: new Date('2026-10-26T10:05:00Z'),
      }

      const mockStepRuns = [
        {
          stepKey: 'slow-step',
          status: 'succeeded',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:04:30Z'),
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:00:00Z'),
        },
        {
          stepKey: 'fast-step',
          status: 'succeeded',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:04:30Z'),
          completedAt: new Date('2026-10-26T10:05:00Z'),
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:04:30Z'),
        },
      ]

      mockPrisma.workflowRun.findUnique.mockResolvedValue(mockRun)
      mockPrisma.workflowStepRun.findMany.mockResolvedValue(mockStepRuns)

      const result = await service.getPerformance('run-123')

      expect(result.bottlenecks.length).toBeGreaterThan(0)
      expect(result.bottlenecks[0].stepKey).toBe('slow-step')
      expect(result.bottlenecks[0].reason).toContain('Longest step duration')
      expect(result.bottlenecks[0].suggestion).toContain('breaking into smaller steps')
    })

    it('should detect retry bottlenecks', async () => {
      const mockRun = {
        id: 'run-123',
        organizationId: 'org-123',
        projectId: 'proj-456',
        workflowKey: 'test-workflow',
        status: 'succeeded',
        startedAt: new Date('2026-10-26T10:00:00Z'),
        completedAt: new Date('2026-10-26T10:05:00Z'),
      }

      const mockStepRuns = [
        {
          stepKey: 'flaky-step',
          status: 'failed',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:01:00Z'),
          errorMessage: 'Timeout',
          createdAt: new Date('2026-10-26T10:00:00Z'),
        },
        {
          stepKey: 'flaky-step',
          status: 'succeeded',
          attempt: 2,
          startedAt: new Date('2026-10-26T10:01:30Z'),
          completedAt: new Date('2026-10-26T10:03:00Z'),
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:01:30Z'),
        },
      ]

      mockPrisma.workflowRun.findUnique.mockResolvedValue(mockRun)
      mockPrisma.workflowStepRun.findMany.mockResolvedValue(mockStepRuns)

      const result = await service.getPerformance('run-123')

      expect(result.steps[0].retries).toBe(1)
      expect(result.steps[0].errorHistory).toHaveLength(1)
      expect(result.steps[0].errorHistory![0].errorMessage).toBe('Timeout')
      expect(result.bottlenecks.some((b) => b.reason.includes('retries'))).toBe(true)
      expect(result.summary.totalRetries).toBe(1)
    })

    it('should detect steps exceeding 5 minutes', async () => {
      const mockRun = {
        id: 'run-123',
        organizationId: 'org-123',
        projectId: 'proj-456',
        workflowKey: 'test-workflow',
        status: 'succeeded',
        startedAt: new Date('2026-10-26T10:00:00Z'),
        completedAt: new Date('2026-10-26T10:10:00Z'),
      }

      const mockStepRuns = [
        {
          stepKey: 'very-slow-step',
          status: 'succeeded',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:06:00Z'), // 6 minutes
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:00:00Z'),
        },
      ]

      mockPrisma.workflowRun.findUnique.mockResolvedValue(mockRun)
      mockPrisma.workflowStepRun.findMany.mockResolvedValue(mockStepRuns)

      const result = await service.getPerformance('run-123')

      // Step is 6 minutes (60% of 10 min total), so it should be flagged as bottleneck
      expect(result.bottlenecks.length).toBeGreaterThan(0)
      expect(result.bottlenecks[0].stepKey).toBe('very-slow-step')
      expect(result.bottlenecks[0].reason).toMatch(/Longest step duration|exceeds 5 minutes/)
    })

    it('should compute summary statistics correctly', async () => {
      const mockRun = {
        id: 'run-123',
        organizationId: 'org-123',
        projectId: 'proj-456',
        workflowKey: 'test-workflow',
        status: 'succeeded',
        startedAt: new Date('2026-10-26T10:00:00Z'),
        completedAt: new Date('2026-10-26T10:10:00Z'),
      }

      const mockStepRuns = [
        {
          stepKey: 'step1',
          status: 'succeeded',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:02:00Z'),
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:00:00Z'),
        },
        {
          stepKey: 'step2',
          status: 'succeeded',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:02:00Z'),
          completedAt: new Date('2026-10-26T10:06:00Z'),
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:02:00Z'),
        },
        {
          stepKey: 'step3',
          status: 'succeeded',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:06:00Z'),
          completedAt: new Date('2026-10-26T10:10:00Z'),
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:06:00Z'),
        },
      ]

      mockPrisma.workflowRun.findUnique.mockResolvedValue(mockRun)
      mockPrisma.workflowStepRun.findMany.mockResolvedValue(mockStepRuns)

      const result = await service.getPerformance('run-123')

      expect(result.summary.totalSteps).toBe(3)
      expect(result.summary.completedSteps).toBe(3)
      expect(result.summary.failedSteps).toBe(0)
      expect(result.summary.averageStepDuration).toBeCloseTo(200, 0) // (120 + 240 + 240) / 3
      expect(result.summary.longestStepKey).toBe('step2') // or step3, both are 240s
      expect(result.summary.longestStepDuration).toBe(240)
      expect(result.summary.totalRetries).toBe(0)
    })

    it('should handle mixed step statuses', async () => {
      const mockRun = {
        id: 'run-123',
        organizationId: 'org-123',
        projectId: 'proj-456',
        workflowKey: 'test-workflow',
        status: 'failed',
        startedAt: new Date('2026-10-26T10:00:00Z'),
        completedAt: new Date('2026-10-26T10:05:00Z'),
      }

      const mockStepRuns = [
        {
          stepKey: 'step1',
          status: 'succeeded',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:02:00Z'),
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:00:00Z'),
        },
        {
          stepKey: 'step2',
          status: 'failed',
          attempt: 1,
          startedAt: new Date('2026-10-26T10:02:00Z'),
          completedAt: new Date('2026-10-26T10:03:00Z'),
          errorMessage: 'Step failed',
          createdAt: new Date('2026-10-26T10:02:00Z'),
        },
        {
          stepKey: 'step3',
          status: 'skipped',
          attempt: 0,
          startedAt: null,
          completedAt: null,
          errorMessage: null,
          createdAt: new Date('2026-10-26T10:03:00Z'),
        },
      ]

      mockPrisma.workflowRun.findUnique.mockResolvedValue(mockRun)
      mockPrisma.workflowStepRun.findMany.mockResolvedValue(mockStepRuns)

      const result = await service.getPerformance('run-123')

      expect(result.summary.totalSteps).toBe(3)
      expect(result.summary.completedSteps).toBe(1)
      expect(result.summary.failedSteps).toBe(1)
    })
  })
})
