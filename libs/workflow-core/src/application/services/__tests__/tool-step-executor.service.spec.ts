import type { IArtifactManager, IWorkspaceManager } from '@vyrak/agent-runtime'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkflowRun } from '../../../domain/entities/workflow-run.entity'
import { StepStatus, StepType } from '../../../domain/step-types'
import { ToolStepExecutor, type ITestResultParser, type TestResults } from '../tool-step-executor.service'
import type { StepDefinition } from '../workflow-definition'

describe('ToolStepExecutor', () => {
  let toolStepExecutor: ToolStepExecutor
  let mockWorkspaceManager: IWorkspaceManager
  let mockArtifactManager: IArtifactManager
  let mockTestResultParser: ITestResultParser

  const mockRun: WorkflowRun = {
    id: 'run-123',
    workflowKey: 'ai-sdlc-v1',
    workflowVersion: '1.0.0',
    organizationId: 'org-456',
    projectId: 'project-789',
    state: 'RUNNING' as any,
    initiatedByUserId: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    mockWorkspaceManager = {
      getRepoPath: vi.fn().mockReturnValue(process.cwd()),
      createWorkspace: vi.fn(),
      cleanupWorkspace: vi.fn(),
      getArtifactsPath: vi.fn(),
    } as unknown as IWorkspaceManager

    mockArtifactManager = {
      saveArtifact: vi.fn().mockResolvedValue('artifact-123'),
      getArtifact: vi.fn(),
    } as unknown as IArtifactManager

    mockTestResultParser = {
      parseJSON: vi.fn(),
      parseJUnit: vi.fn(),
      parseTAP: vi.fn(),
    }

    toolStepExecutor = new ToolStepExecutor(mockWorkspaceManager, mockArtifactManager, mockTestResultParser)
  })

  describe('canHandle', () => {
    it('should return true for TOOL step type', () => {
      expect(toolStepExecutor.canHandle(StepType.TOOL)).toBe(true)
    })

    it('should return false for non-TOOL step types', () => {
      expect(toolStepExecutor.canHandle(StepType.AGENT)).toBe(false)
      expect(toolStepExecutor.canHandle(StepType.APPROVAL)).toBe(false)
    })
  })

  describe('execute', () => {
    it('should execute command successfully with zero exit code', async () => {
      const step: StepDefinition = {
        key: 'test',
        type: StepType.TOOL,
        config: {
          command: 'node -e "console.log(\'hello\')"',
          timeout: 5000,
        },
      }

      const result = await toolStepExecutor.execute(step, mockRun)

      expect(result.status).toBe(StepStatus.SUCCEEDED)
      expect(result.output).toMatchObject({
        command: 'node -e "console.log(\'hello\')"',
        exitCode: 0,
      })
      expect(result.errorCode).toBeUndefined()
      expect(result.errorMessage).toBeUndefined()
      expect(mockArtifactManager.saveArtifact).toHaveBeenCalled()
    })

    it('should mark step as failed on non-zero exit code', async () => {
      const step: StepDefinition = {
        key: 'test',
        type: StepType.TOOL,
        config: {
          command: 'node -e "process.exit(1)"',
          timeout: 5000,
        },
      }

      const result = await toolStepExecutor.execute(step, mockRun)

      expect(result.status).toBe(StepStatus.FAILED)
      expect(result.output).toMatchObject({
        command: 'node -e "process.exit(1)"',
        exitCode: 1,
      })
      expect(result.errorCode).toBe('COMMAND_FAILED')
      expect(result.errorMessage).toBeDefined()
    })

    it('should parse JSON test results when available', async () => {
      const testResults: TestResults = {
        passed: 10,
        failed: 2,
        skipped: 1,
        total: 13,
      }

      vi.mocked(mockTestResultParser.parseJSON).mockReturnValue(testResults)

      const step: StepDefinition = {
        key: 'test',
        type: StepType.TOOL,
        config: {
          command: 'node -e "console.log(JSON.stringify({testResults: [], numPassedTests: 10}))"',
          timeout: 5000,
        },
      }

      const result = await toolStepExecutor.execute(step, mockRun)

      expect(result.status).toBe(StepStatus.SUCCEEDED)
      expect(result.output).toMatchObject({
        testResults: {
          passed: 10,
          failed: 2,
          skipped: 1,
          total: 13,
        },
      })
    })

    it('should throw error when command is missing', async () => {
      const step: StepDefinition = {
        key: 'test',
        type: StepType.TOOL,
        config: {},
      }

      const result = await toolStepExecutor.execute(step, mockRun)

      expect(result.status).toBe(StepStatus.FAILED)
      expect(result.errorCode).toBe('EXECUTION_ERROR')
      expect(result.errorMessage).toContain('Missing command')
    })

    it('should throw error when config is missing', async () => {
      const step: StepDefinition = {
        key: 'test',
        type: StepType.TOOL,
      }

      const result = await toolStepExecutor.execute(step, mockRun)

      expect(result.status).toBe(StepStatus.FAILED)
      expect(result.errorCode).toBe('EXECUTION_ERROR')
      expect(result.errorMessage).toContain('Missing tool configuration')
    })

    it('should save execution artifact with stdout and stderr', async () => {
      const step: StepDefinition = {
        key: 'test',
        type: StepType.TOOL,
        config: {
          command: 'node -e "console.log(\'output\')"',
          timeout: 5000,
        },
      }

      await toolStepExecutor.execute(step, mockRun)

      expect(mockArtifactManager.saveArtifact).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-456',
          runId: 'run-123',
          filePath: 'test-execution-result.json',
          content: expect.stringContaining('"command"'),
        })
      )
    })

    it('should handle command timeout gracefully', async () => {
      const step: StepDefinition = {
        key: 'test',
        type: StepType.TOOL,
        config: {
          command: 'node -e "setTimeout(() => {}, 10000)"',
          timeout: 100, // 100ms timeout
        },
      }

      const result = await toolStepExecutor.execute(step, mockRun)

      expect(result.status).toBe(StepStatus.FAILED)
      expect(result.output).toMatchObject({
        exitCode: expect.any(Number),
      })
    })

    it('should use custom working directory when specified', async () => {
      const step: StepDefinition = {
        key: 'test',
        type: StepType.TOOL,
        config: {
          command: 'node -e "console.log(\'test\')"',
          workdir: '.',
          timeout: 5000,
        },
      }

      const result = await toolStepExecutor.execute(step, mockRun)

      expect(result.status).toBe(StepStatus.SUCCEEDED)
      expect(mockWorkspaceManager.getRepoPath).toHaveBeenCalledWith('run-123')
    })
  })
})
