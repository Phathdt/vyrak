import { Test } from '@nestjs/testing'
import { DatabaseService } from '@vyrak/database'
import { WorkflowExecutorService } from '@vyrak/workflow-core'

import { Job } from 'bullmq'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { WorkflowExecutionProcessor } from './workflow-execution.processor'

describe('WorkflowExecutionProcessor', () => {
  let processor: WorkflowExecutionProcessor
  let executor: WorkflowExecutorService
  let db: DatabaseService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkflowExecutionProcessor,
        {
          provide: WorkflowExecutorService,
          useValue: {
            executeRun: vi.fn(),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            setTenantContext: vi.fn(),
            clearTenantContext: vi.fn(),
          },
        },
      ],
    }).compile()

    processor = module.get(WorkflowExecutionProcessor)
    executor = module.get(WorkflowExecutorService)
    db = module.get(DatabaseService)
  })

  describe('process', () => {
    it('should process workflow job successfully', async () => {
      const job = {
        id: 'job-123',
        name: 'execute-workflow',
        data: {
          runId: 'run-456',
          organizationId: 'org-789',
        },
      } as Job

      await processor.process(job)

      expect(db.setTenantContext).toHaveBeenCalledWith('org-789')
      expect(executor.executeRun).toHaveBeenCalledWith('run-456')
      expect(db.clearTenantContext).toHaveBeenCalled()
    })

    it('should set and clear tenant context on error', async () => {
      const job = {
        id: 'job-123',
        name: 'execute-workflow',
        data: {
          runId: 'run-456',
          organizationId: 'org-789',
        },
      } as Job

      const error = new Error('Execution failed')
      vi.mocked(executor.executeRun).mockRejectedValue(error)

      await expect(processor.process(job)).rejects.toThrow('Execution failed')

      expect(db.setTenantContext).toHaveBeenCalledWith('org-789')
      expect(executor.executeRun).toHaveBeenCalledWith('run-456')
      expect(db.clearTenantContext).toHaveBeenCalled() // Cleanup even on error
    })

    it('should handle step job with stepKey', async () => {
      const job = {
        id: 'job-123',
        name: 'execute-step',
        data: {
          runId: 'run-456',
          stepKey: 'plan',
          organizationId: 'org-789',
        },
      } as Job

      await processor.process(job)

      expect(db.setTenantContext).toHaveBeenCalledWith('org-789')
      expect(executor.executeRun).toHaveBeenCalledWith('run-456')
      expect(db.clearTenantContext).toHaveBeenCalled()
    })

    it('should clear tenant context even if setTenantContext throws', async () => {
      const job = {
        id: 'job-123',
        name: 'execute-workflow',
        data: {
          runId: 'run-456',
          organizationId: 'org-789',
        },
      } as Job

      const error = new Error('Database connection failed')
      vi.mocked(db.setTenantContext).mockImplementation(() => {
        throw error
      })

      await expect(processor.process(job)).rejects.toThrow('Database connection failed')

      expect(db.clearTenantContext).toHaveBeenCalled()
    })

    it('should handle non-Error exceptions', async () => {
      const job = {
        id: 'job-123',
        name: 'execute-workflow',
        data: {
          runId: 'run-456',
          organizationId: 'org-789',
        },
      } as Job

      vi.mocked(executor.executeRun).mockRejectedValue('String error')

      await expect(processor.process(job)).rejects.toBe('String error')

      expect(db.clearTenantContext).toHaveBeenCalled()
    })

    it('should log job processing start and completion', async () => {
      const job = {
        id: 'job-123',
        name: 'execute-workflow',
        data: {
          runId: 'run-456',
          organizationId: 'org-789',
        },
      } as Job

      const logSpy = vi.spyOn(processor['logger'], 'log')

      await processor.process(job)

      expect(logSpy).toHaveBeenCalledWith(
        'Processing job execute-workflow for run run-456 (org: org-789)'
      )
      expect(logSpy).toHaveBeenCalledWith('Job execute-workflow completed for run run-456')
    })

    it('should log job processing errors with stack trace', async () => {
      const job = {
        id: 'job-123',
        name: 'execute-workflow',
        data: {
          runId: 'run-456',
          organizationId: 'org-789',
        },
      } as Job

      const error = new Error('Execution failed')
      error.stack = 'Error: Execution failed\n  at ...'
      vi.mocked(executor.executeRun).mockRejectedValue(error)

      const errorSpy = vi.spyOn(processor['logger'], 'error')

      await expect(processor.process(job)).rejects.toThrow('Execution failed')

      expect(errorSpy).toHaveBeenCalledWith(
        'Job execute-workflow failed for run run-456: Execution failed',
        error.stack
      )
    })
  })
})
