import { DependencyGraph, RepoCacheService, SubTaskStatus } from '@vyrak/workflow-core'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import {
  ImplementationPlanNotFoundError,
  TaskExecutionError,
  WorkspacePreparationError,
} from '../../domain/exceptions/orchestration.exceptions'
import { ImplementationAgentRunner, type ImplementationContext } from '../../infras/agents/implementation-agent.runner'
import { ParallelExecutor } from '../../infras/orchestrators/parallel-executor'
import { GitWorktreeService, type WorktreePrepareInput } from '../../infras/workspace/git-worktree.service'

import type {
  IImplementationOrchestrationService,
  OrchestrationStatus,
  TaskExecutionResult,
} from '../../domain/interfaces/orchestration-engine.interface'
import type { IAIAgentService } from '@vyrak/ai-agent'
import type { IArtifactService } from '@vyrak/artifact'
import type { IConfigService } from '@vyrak/custom-config'
import type { EnhancedLogger } from '@vyrak/custom-logger'
import type { IGitHubAuthService } from '@vyrak/github-auth'
import type {
  IRepoCacheService,
  ISubTaskRepository,
  IWorkflowDependencyRepository,
  IWorkflowRepository,
  RepositoryContextService,
  SubTaskEntity,
  WorkflowEntity,
} from '@vyrak/workflow-core'

/**
 * Implementation Orchestration Service
 * Orchestrates sub-task execution with parallel/sequential dependency handling
 * Plain TypeScript class - NO @Injectable() decorator
 */
export class ImplementationOrchestrationService implements IImplementationOrchestrationService {
  private readonly parallelExecutor: ParallelExecutor
  private readonly gitWorktreeService: GitWorktreeService
  private readonly implementationRunner: ImplementationAgentRunner

  constructor(
    private readonly subTaskRepository: ISubTaskRepository,
    private readonly workflowDependencyRepository: IWorkflowDependencyRepository,
    private readonly workflowRepository: IWorkflowRepository,
    private readonly artifactService: IArtifactService,
    aiAgentService: IAIAgentService,
    private readonly configService: IConfigService,
    private readonly logger: EnhancedLogger,
    githubAuthService: IGitHubAuthService,
    maxConcurrency: number = 3,
    private readonly repositoryContext?: RepositoryContextService,
    repoCache: IRepoCacheService = new RepoCacheService(configService, githubAuthService)
  ) {
    this.parallelExecutor = new ParallelExecutor(maxConcurrency)
    this.gitWorktreeService = new GitWorktreeService(configService, repoCache)
    this.implementationRunner = new ImplementationAgentRunner(aiAgentService)
  }

  async startImplementation(workflowId: string, phaseId: string): Promise<void> {
    this.logger.info(`Starting implementation orchestration for workflow ${workflowId}, phase ${phaseId}`)

    try {
      // Load workflow
      const workflow = await this.workflowRepository.findById(workflowId)
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`)
      }
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`)
      }

      // Load sub-tasks for this workflow
      // Note: Tasks are created during Tech Refinement but executed during Implementation
      // So we query by workflowId instead of phaseId
      const allTasks = await this.subTaskRepository.findByWorkflowId(workflowId)
      if (allTasks.length === 0) {
        this.logger.warn(`No sub-tasks found for workflow ${workflowId}`)
        return
      }

      // Load dependencies
      const dependencies = await this.workflowDependencyRepository.findByWorkflowId(workflowId)

      // Validate no cycles
      const cycleCheck = DependencyGraph.detectCycles(allTasks, dependencies)
      if (cycleCheck.hasCycle) {
        throw new Error(`Cyclic dependency detected: ${cycleCheck.cycle?.join(' -> ')}`)
      }

      // Load Implementation Plan artifact
      const implementationPlanArtifact = await this.loadImplementationPlanArtifact(workflowId, phaseId)

      // Load other context artifacts (PRD, Technical Specs)
      const contextArtifacts = await this.loadContextArtifacts(workflowId)

      // Execute tasks with dependency awareness
      await this.executeTasksWithDependencies(
        workflow,
        phaseId,
        allTasks,
        dependencies,
        implementationPlanArtifact,
        contextArtifacts
      )

      this.logger.log(`Implementation orchestration completed for workflow ${workflowId}`)
    } catch (_error) {
      const err = _error instanceof Error ? _error : new Error(String(_error))
      this.logger.error(`Implementation orchestration failed for workflow ${workflowId}`, err.message)
      throw _error
    }
  }

  async getStatus(workflowId: string, phaseId: string): Promise<OrchestrationStatus> {
    const tasks = await this.subTaskRepository.findByPhaseId(phaseId)

    const statusCounts = tasks.reduce(
      (acc, task) => {
        switch (task.status) {
          case 'COMPLETED':
            acc.completedTasks++
            break
          case 'FAILED':
            acc.failedTasks++
            break
          case 'IN_PROGRESS':
            acc.inProgressTasks++
            break
          case 'READY':
            acc.readyTasks++
            break
          case 'PENDING':
          case 'WAITING_DEPENDENCY':
          case 'BLOCKED':
            acc.pendingTasks++
            break
        }
        return acc
      },
      {
        completedTasks: 0,
        failedTasks: 0,
        inProgressTasks: 0,
        readyTasks: 0,
        pendingTasks: 0,
      }
    )

    return {
      workflowId,
      phaseId,
      totalTasks: tasks.length,
      ...statusCounts,
      tasks,
    }
  }

  async retryTask(taskId: string): Promise<TaskExecutionResult> {
    const task = await this.subTaskRepository.findById(taskId)
    if (!task) {
      throw new TaskExecutionError(taskId, 'Task not found')
    }

    this.logger.log(`Retrying task ${taskId}`)

    // Reset task status to READY
    await this.subTaskRepository.updateStatus(taskId, SubTaskStatus.READY)

    // Execute single task
    const result = await this.executeSingleTask(task)

    return result
  }

  private async executeTasksWithDependencies(
    workflow: WorkflowEntity,
    phaseId: string,
    allTasks: SubTaskEntity[],
    _dependencies: unknown[],
    implementationPlan: string,
    contextArtifacts: { prd?: string; technicalSpecs?: string }
  ): Promise<void> {
    // Mark all tasks as READY initially (they may be PENDING)
    for (const task of allTasks) {
      if (task.status === SubTaskStatus.PENDING) {
        await this.subTaskRepository.updateStatus(task.id, SubTaskStatus.READY)
      }
    }

    // Use parallel executor with dependency awareness
    const result = await this.parallelExecutor.executeWithDependencies(
      allTasks.map((t) => t.id),
      async (taskId: string) => {
        const deps = await this.subTaskRepository.findDependencies(taskId)
        return deps
      },
      async (taskId: string) => {
        const task = await this.subTaskRepository.findById(taskId)
        if (!task) {
          throw new TaskExecutionError(taskId, 'Task not found during execution')
        }

        return this.executeSingleTask(task, {
          workflow,
          phaseId,
          implementationPlan,
          contextArtifacts,
        })
      },
      {
        onTaskStart: (taskId: string) => {
          this.logger.log(`Starting task execution: ${taskId}`)
          this.subTaskRepository.updateStatus(taskId, SubTaskStatus.IN_PROGRESS).catch((err) => {
            const error = err instanceof Error ? err : new Error(String(err))
            this.logger.error(`Failed to update task status to IN_PROGRESS: ${taskId}`, error.message)
          })
        },
        onTaskComplete: (result: TaskExecutionResult) => {
          this.logger.log(`Task completed: ${result.taskId}`)
          const status: SubTaskStatus = result.status === 'completed' ? SubTaskStatus.COMPLETED : SubTaskStatus.FAILED
          this.subTaskRepository.updateStatus(result.taskId, status).catch((err) => {
            const error = err instanceof Error ? err : new Error(String(err))
            this.logger.error(`Failed to update task status after completion: ${result.taskId}`, error.message)
          })
        },
        onTaskError: (taskId: string, error: Error) => {
          this.logger.error(`Task execution error: ${taskId}`, error.message)
          this.subTaskRepository.updateStatus(taskId, SubTaskStatus.FAILED).catch((err) => {
            const error = err instanceof Error ? err : new Error(String(err))
            this.logger.error(`Failed to update task status to FAILED: ${taskId}`, error.message)
          })
        },
      }
    )

    this.logger.log(
      `Orchestration completed: ${result.completed.length} succeeded, ${result.failed.length} failed, ${result.duration}ms`
    )
  }

  private async executeSingleTask(
    task: SubTaskEntity,
    context?: {
      workflow: WorkflowEntity
      phaseId: string
      implementationPlan: string
      contextArtifacts: { prd?: string; technicalSpecs?: string }
    }
  ): Promise<TaskExecutionResult> {
    try {
      // Prepare git worktree workspace
      const workspacePath = await this.prepareWorkspace(task)

      // If context not provided, load it
      let workflow = context?.workflow
      let implementationPlan = context?.implementationPlan
      let contextArtifacts = context?.contextArtifacts

      if (!workflow) {
        const loadedWorkflow = await this.workflowRepository.findById(task.workflowId)
        if (!loadedWorkflow) {
          throw new Error(`Workflow not found: ${task.workflowId}`)
        }
        workflow = loadedWorkflow
      }

      if (!implementationPlan && task.phaseId) {
        implementationPlan = await this.loadImplementationPlanArtifact(task.workflowId, task.phaseId)
      }

      if (!contextArtifacts) {
        contextArtifacts = await this.loadContextArtifacts(task.workflowId)
      }

      // Build execution context
      const executionContext: ImplementationContext = {
        workflow: {
          id: workflow.id,
          title: workflow.title,
          description: workflow.description || '',
        },
        phase: {
          id: task.phaseId || '',
          key: task.phaseId || '',
        },
        task,
        artifacts: {
          prd: contextArtifacts.prd,
          technicalSpecs: contextArtifacts.technicalSpecs,
          implementationPlan,
        },
        workspacePath,
      }

      // Execute task with implementation agent
      const result = await this.implementationRunner.executeTask(executionContext)

      // Save implementation report as artifact
      if (result.reportContent) {
        await this.saveImplementationReport(task, result.reportContent)
      }

      return result
    } catch (_error) {
      const err = _error instanceof Error ? _error : new Error(String(_error))
      throw new TaskExecutionError(task.id, `Failed to execute task: ${err.message}`, err)
    }
  }

  private async prepareWorkspace(task: SubTaskEntity): Promise<string> {
    try {
      const workflow = await this.workflowRepository.findById(task.workflowId)
      if (!workflow) {
        throw new Error(`Workflow not found: ${task.workflowId}`)
      }

      // Check if worktree mode is enabled
      const workspaceMode = this.configService.workspace?.mode || 'clone'

      if (workspaceMode === 'worktree') {
        if (!this.repositoryContext) {
          throw new Error('RepositoryContextService is required to prepare a worktree')
        }
        const repository = await this.repositoryContext.resolveRepository(task.workflowId)
        if (!repository) {
          throw new Error(`Workflow ${task.workflowId} has no linked repository`)
        }

        // Use git worktree for isolation
        const input: WorktreePrepareInput = {
          organizationId: task.organizationId,
          projectId: workflow.projectId || '',
          workflowId: task.workflowId,
          phaseKey: task.key,
          repository,
        }

        const worktreeResult = await this.gitWorktreeService.prepareWorktree(input)
        return worktreeResult.workspacePath
      } else {
        // Use standard workspaces path
        const workspacesPath = this.configService.workspace?.workspacesPath || '/tmp/vyrak-workspaces'
        const workspacePath = path.join(
          workspacesPath,
          task.organizationId,
          workflow.projectId || 'default',
          task.workflowId,
          task.key
        )

        // Ensure directory exists
        await mkdir(workspacePath, { recursive: true })

        return workspacePath
      }
    } catch (_error) {
      const err = _error instanceof Error ? _error : new Error(String(_error))
      throw new WorkspacePreparationError(`Failed to prepare workspace for task ${task.id}`, err)
    }
  }

  private async loadImplementationPlanArtifact(workflowId: string, phaseId: string): Promise<string> {
    try {
      const artifacts = await this.artifactService.listPhaseArtifacts(phaseId)
      const planArtifact = artifacts.find((a) => a.type === 'implementation-plan' || a.key.includes('implementation'))

      if (!planArtifact) {
        throw new ImplementationPlanNotFoundError(workflowId, phaseId)
      }

      const artifactWithContent = await this.artifactService.downloadArtifact(planArtifact.id)
      return artifactWithContent.content
    } catch (_error) {
      this.logger.warn(`Implementation Plan artifact not found for workflow ${workflowId}, phase ${phaseId}`)
      return ''
    }
  }

  private async loadContextArtifacts(workflowId: string): Promise<{ prd?: string; technicalSpecs?: string }> {
    const artifacts = await this.artifactService.listWorkflowArtifacts(workflowId)

    const prdArtifact = artifacts.find((a) => a.type === 'prd' || a.key === 'prd')
    const techSpecsArtifact = artifacts.find((a) => a.type === 'ard' || a.type === 'adr' || a.key.includes('technical'))

    const result: { prd?: string; technicalSpecs?: string } = {}

    if (prdArtifact) {
      try {
        const content = await this.artifactService.downloadArtifact(prdArtifact.id)
        result.prd = content.content
      } catch (_error) {
        this.logger.warn(`Failed to load PRD artifact: ${prdArtifact.id}`)
      }
    }

    if (techSpecsArtifact) {
      try {
        const content = await this.artifactService.downloadArtifact(techSpecsArtifact.id)
        result.technicalSpecs = content.content
      } catch (_error) {
        this.logger.warn(`Failed to load technical specs artifact: ${techSpecsArtifact.id}`)
      }
    }

    return result
  }

  private async saveImplementationReport(task: SubTaskEntity, reportContent: string): Promise<void> {
    try {
      await this.artifactService.uploadArtifact(
        task.workflowId,
        'implementation-report',
        `implementation-report-${task.key}`,
        `Implementation Report: ${task.title}`,
        reportContent,
        {
          phaseId: task.phaseId,
          metadata: {
            taskId: task.id,
            taskKey: task.key,
          },
        }
      )
    } catch (_error) {
      const err = _error instanceof Error ? _error : new Error(String(_error))
      this.logger.error(`Failed to save implementation report for task ${task.id}`, err.message)
    }
  }
}
