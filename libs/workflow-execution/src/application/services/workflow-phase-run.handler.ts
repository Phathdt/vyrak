import { ConversationPhase, IConversationService, MessageRole } from '@vyrak/conversation'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { PhaseExecutionStatus, PhaseRunType } from '../../domain/schemas/phase-execution.schemas'
import { ClaudeCodeRunner } from '../../infras/agent/claude-code.runner'
import { GitWorktreeService } from '../../infras/workspace/git-worktree.service'

import type { PhaseExecutionMeta, WorkflowPhaseRunJob } from '../../domain/schemas/phase-execution.schemas'
import type { IAIAgentService } from '@vyrak/ai-agent'
import type { IConfigService } from '@vyrak/custom-config'

const execFileAsync = promisify(execFile)

export class WorkflowPhaseRunHandler {
  private readonly gitWorktree: GitWorktreeService
  private readonly claudeCode: ClaudeCodeRunner
  private readonly logger: EnhancedLogger

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly conversationService: IConversationService,
    aiAgentService: IAIAgentService,
    configService: IConfigService,
    enhancedLogger?: EnhancedLogger
  ) {
    this.logger =
      enhancedLogger?.with({ context: 'WorkflowPhaseRunHandler' }) ??
      ({
        log: console.log,
        error: console.error,
        warn: console.warn,
      } as unknown as EnhancedLogger)
    this.gitWorktree = new GitWorktreeService(configService)
    this.claudeCode = new ClaudeCodeRunner(configService, aiAgentService)
  }

  async handle(job: WorkflowPhaseRunJob): Promise<void> {
    try {
      switch (job.runType) {
        case PhaseRunType.IMPLEMENTATION:
          await this.runImplementation(job)
          return
        case PhaseRunType.REVIEW:
          await this.runReview(job)
          return
        case PhaseRunType.QA:
          await this.runQa(job)
          return
        default:
          throw new Error(`Unsupported run type: ${job.runType}`)
      }
    } catch (error) {
      await this.markFailed(job, error)
      throw error
    }
  }

  async markFailed(job: WorkflowPhaseRunJob, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error)
    await this.finishPhaseRun(job, {
      status: PhaseExecutionStatus.FAILED,
      runType: job.runType,
      lastError: message.slice(0, 2000),
      finishedAt: new Date().toISOString(),
    })
  }

  private async runImplementation(job: WorkflowPhaseRunJob): Promise<void> {
    this.logger.log(`[Implementation] Loading workflow context: workflowId=${job.workflowId}`)
    const context = await this.loadWorkflowContext(job)

    this.logger.log(`[Implementation] Building planning transcript: workflowId=${job.workflowId}`)
    const planText = await this.buildPlanningTranscript(job.workflowId)

    this.logger.log(`[Implementation] Preparing worktree: projectId=${context.projectId} phaseKey=${job.phaseKey}`)
    const { workspacePath, branch } = await this.gitWorktree.prepareWorktree({
      organizationId: job.organizationId,
      projectId: context.projectId,
      workflowId: job.workflowId,
      repositoryName: context.repositoryName,
      phaseKey: job.phaseKey,
    })
    this.logger.log(`[Implementation] Worktree ready: branch=${branch} workspace=${workspacePath}`)

    this.logger.log(`[Implementation] Starting Claude Code agent (maxTurns: 100): workflowId=${job.workflowId}`)
    const agentResult = await this.claudeCode.runImplementation({
      workspacePath,
      planText,
      workflowId: job.workflowId,
    })
    this.logger.log(
      `[Implementation] Claude Code completed: workflowId=${job.workflowId} stopReason=${agentResult.stopReason}`
    )

    this.logger.log(`[Implementation] Committing changes: workspacePath=${workspacePath}`)
    const commitSha = await this.commitWorkspaceChanges(workspacePath, job.workflowId)
    if (commitSha) {
      this.logger.log(`[Implementation] Committed: sha=${commitSha.slice(0, 8)}`)
    } else {
      this.logger.log(`[Implementation] No changes to commit`)
    }

    // Push branch to remote
    let pushSuccess = false
    if (commitSha) {
      this.logger.log(`[Implementation] Pushing branch: branch=${branch}`)
      pushSuccess = await this.pushBranch(workspacePath, branch)
      if (pushSuccess) {
        this.logger.log(`[Implementation] Branch pushed successfully: branch=${branch}`)
      } else {
        this.logger.warn(`[Implementation] Failed to push branch: branch=${branch}`)
      }
    }

    // Create PR if push succeeded
    let pullRequestUrl: string | undefined
    let pullRequestNumber: number | undefined
    if (pushSuccess) {
      this.logger.log(`[Implementation] Creating pull request: branch=${branch}`)
      const prResult = await this.createPullRequest(workspacePath, branch, job.workflowId, agentResult.content)
      pullRequestUrl = prResult.url
      pullRequestNumber = prResult.number
      if (pullRequestUrl) {
        this.logger.log(`[Implementation] PR created: url=${pullRequestUrl} number=${pullRequestNumber}`)
      } else {
        this.logger.warn(`[Implementation] Failed to create PR`)
      }
    }

    this.logger.log(`[Implementation] Finishing phase run: workflowId=${job.workflowId} status=AWAITING_USER`)
    await this.finishPhaseRun(
      job,
      {
        status: PhaseExecutionStatus.AWAITING_USER,
        runType: PhaseRunType.IMPLEMENTATION,
        branch,
        workspacePath,
        pullRequestUrl,
        pullRequestNumber,
        finishedAt: new Date().toISOString(),
      },
      {
        implementationLog: agentResult.content.slice(0, 12_000),
        commitSha,
        usedFakeAgent: agentResult.usedFakeAgent,
      }
    )
    this.logger.log(`[Implementation] Phase run completed successfully: workflowId=${job.workflowId}`)
  }

  private async runReview(job: WorkflowPhaseRunJob): Promise<void> {
    const implPhase = await this.databaseService.client.workflowPhase.findFirst({
      where: { workflowId: job.workflowId, key: 'implementation', organizationId: job.organizationId },
    })
    const implOutput = (implPhase?.output ?? {}) as { execution?: PhaseExecutionMeta }
    const branch = implOutput.execution?.branch ?? 'unknown'
    const workspacePath = implOutput.execution?.workspacePath

    if (workspacePath && branch !== 'unknown') {
      const result = await this.claudeCode.runReview({
        workspacePath,
        branch,
        workflowId: job.workflowId,
      })

      await this.finishPhaseRun(
        job,
        {
          status: PhaseExecutionStatus.AWAITING_USER,
          runType: PhaseRunType.REVIEW,
          branch,
          workspacePath,
          finishedAt: new Date().toISOString(),
        },
        { reviewSummary: result.content.slice(0, 12_000) }
      )
      return
    }

    const reviewSummary = `Review skipped: no implementation workspace metadata for branch \`${branch}\`.`
    await this.finishPhaseRun(
      job,
      {
        status: PhaseExecutionStatus.AWAITING_USER,
        runType: PhaseRunType.REVIEW,
        branch,
        finishedAt: new Date().toISOString(),
      },
      { reviewSummary }
    )
  }

  private async runQa(job: WorkflowPhaseRunJob): Promise<void> {
    await this.finishPhaseRun(
      job,
      {
        status: PhaseExecutionStatus.AWAITING_USER,
        runType: PhaseRunType.QA,
        finishedAt: new Date().toISOString(),
      },
      { qaErrors: [] }
    )
  }

  private async loadWorkflowContext(job: WorkflowPhaseRunJob): Promise<{
    projectId: string
    repositoryName?: string
  }> {
    const workflow = await this.databaseService.client.workflow.findFirst({
      where: { id: job.workflowId, organizationId: job.organizationId },
    })
    if (!workflow) {
      throw new Error('Workflow not found for phase run')
    }

    const link = await this.databaseService.client.workflowRepository.findFirst({
      where: { workflowId: job.workflowId, organizationId: job.organizationId },
    })

    let repositoryName: string | undefined
    if (link) {
      const repo = await this.databaseService.client.gitRepository.findFirst({
        where: { id: link.repositoryId, organizationId: job.organizationId },
      })
      repositoryName = repo?.name
    }

    return { projectId: workflow.projectId, repositoryName }
  }

  private async commitWorkspaceChanges(workspacePath: string, workflowId: string): Promise<string | null> {
    try {
      const { stdout: status } = await execFileAsync('git', ['status', '--porcelain'], { cwd: workspacePath })
      if (!status.trim()) {
        return null
      }
      await execFileAsync('git', ['add', '-A'], { cwd: workspacePath })
      const message = `feat(workflow): implementation for ${workflowId.slice(0, 8)}`
      await execFileAsync('git', ['commit', '-m', message], { cwd: workspacePath })
      const { stdout: sha } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: workspacePath })
      return sha.trim()
    } catch {
      return null
    }
  }

  private async pushBranch(workspacePath: string, branch: string): Promise<boolean> {
    try {
      await execFileAsync('git', ['push', '-u', 'origin', branch], { cwd: workspacePath })
      return true
    } catch (error) {
      // Log but don't fail - user can push manually
      console.error('Failed to push branch:', error)
      return false
    }
  }

  private async createPullRequest(
    workspacePath: string,
    branch: string,
    workflowId: string,
    implementationLog: string
  ): Promise<{ url?: string; number?: number }> {
    try {
      // Get workflow title from database
      const workflow = await this.databaseService.client.workflow.findFirst({
        where: { id: workflowId },
        select: { title: true },
      })

      const title = workflow?.title || `Implementation for ${workflowId.slice(0, 8)}`
      const body = `## Implementation Summary

Automated implementation by Vyrak workflow system.

**Workflow ID:** ${workflowId}
**Branch:** ${branch}

### Changes

${implementationLog.slice(0, 2000)}

---
*This PR was automatically created by Vyrak workflow automation.*`

      // Create PR using gh CLI
      const { stdout } = await execFileAsync(
        'gh',
        ['pr', 'create', '--title', title, '--body', body, '--base', 'main', '--head', branch],
        { cwd: workspacePath }
      )

      // Extract PR URL from output
      const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/)
      const url = urlMatch?.[0]

      // Extract PR number from URL
      const numberMatch = url?.match(/\/pull\/(\d+)/)
      const number = numberMatch ? parseInt(numberMatch[1], 10) : undefined

      return { url, number }
    } catch (error) {
      // Log but don't fail - user can create PR manually
      console.error('Failed to create PR:', error)
      return {}
    }
  }

  private async buildPlanningTranscript(workflowId: string): Promise<string> {
    const sessions = await this.conversationService.getWorkflowSessions(workflowId)
    const planning = sessions
      .filter((s) => s.phase === ConversationPhase.PLANNING)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]

    if (!planning) {
      return '# Plan\n\n(no planning session)'
    }

    const messages = await this.conversationService.getMessages(planning.id)
    return messages
      .filter((m) => m.role === MessageRole.USER || m.role === MessageRole.ASSISTANT)
      .map((m) => `## ${m.role}\n\n${m.content}`)
      .join('\n\n')
  }

  private async finishPhaseRun(
    job: WorkflowPhaseRunJob,
    execution: Partial<PhaseExecutionMeta> & Pick<PhaseExecutionMeta, 'status' | 'runType'>,
    extraOutput?: Record<string, unknown>
  ): Promise<void> {
    const phase = await this.databaseService.client.workflowPhase.findFirst({
      where: { id: job.phaseId, organizationId: job.organizationId },
    })
    if (!phase) {
      return
    }

    const prev = (phase.output ?? {}) as Record<string, unknown>
    const prevExec = (prev.execution ?? {}) as PhaseExecutionMeta

    const merged: PhaseExecutionMeta = {
      ...prevExec,
      ...execution,
      updatedAt: new Date().toISOString(),
    }

    await this.databaseService.client.workflowPhase.update({
      where: { id: job.phaseId },
      data: {
        output: {
          ...prev,
          ...extraOutput,
          execution: merged,
        } as object,
      },
    })
  }
}
