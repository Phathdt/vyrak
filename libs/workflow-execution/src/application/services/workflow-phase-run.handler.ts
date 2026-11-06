import { ConversationPhase, IConversationService, MessageRole } from '@vyrak/conversation'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import { RepoCacheService } from '@vyrak/workflow-core'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { WorkspacePreparationError } from '../../domain/exceptions/orchestration.exceptions'
import { PhaseExecutionStatus, PhaseRunType } from '../../domain/schemas/phase-execution.schemas'
import { ClaudeCodeRunner } from '../../infras/agent/claude-code.runner'
import { GitWorktreeService } from '../../infras/workspace/git-worktree.service'

import type { PhaseExecutionMeta, WorkflowPhaseRunJob } from '../../domain/schemas/phase-execution.schemas'
import type { IAIAgentService } from '@vyrak/ai-agent'
import type { IConfigService } from '@vyrak/custom-config'
import type { IGitHubAuthService, IRepoCacheService, RepositoryReference } from '@vyrak/workflow-core'

type WorkflowRunContext = {
  projectId: string
  repository: RepositoryReference
}

const execFileAsync = promisify(execFile)

export class WorkflowPhaseRunHandler {
  private readonly gitWorktree: GitWorktreeService
  private readonly claudeCode: ClaudeCodeRunner
  private readonly logger: EnhancedLogger
  private readonly repoCache: IRepoCacheService

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly conversationService: IConversationService,
    aiAgentService: IAIAgentService,
    private readonly configService: IConfigService,
    enhancedLogger?: EnhancedLogger,
    repoCache?: IRepoCacheService,
    private readonly githubAuthService?: IGitHubAuthService
  ) {
    this.logger =
      enhancedLogger?.with({ context: 'WorkflowPhaseRunHandler' }) ??
      ({
        log: console.log,
        error: console.error,
        warn: console.warn,
      } as unknown as EnhancedLogger)
    this.repoCache = repoCache ?? new RepoCacheService(configService, githubAuthService)
    this.gitWorktree = new GitWorktreeService(configService, this.repoCache)
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
    const { workspacePath, branch, mainRepoRoot } = await this.gitWorktree.prepareWorktree({
      organizationId: job.organizationId,
      projectId: context.projectId,
      workflowId: job.workflowId,
      phaseKey: job.phaseKey,
      repository: context.repository,
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
      pushSuccess = await this.pushBranch(workspacePath, branch, context.repository.url)
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
      const prResult = await this.createPullRequest(
        workspacePath,
        branch,
        context.repository.branch,
        job.workflowId,
        agentResult.content
      )
      pullRequestUrl = prResult.url
      pullRequestNumber = prResult.number
      if (pullRequestUrl) {
        this.logger.log(`[Implementation] PR created: url=${pullRequestUrl} number=${pullRequestNumber}`)
      } else {
        this.logger.warn(`[Implementation] Failed to create PR`)
      }
    }

    // Once the branch is on the remote the local worktree is no longer needed.
    const workspaceRemoved = pushSuccess ? await this.cleanupWorktreeOnSuccess(mainRepoRoot, workspacePath) : false

    this.logger.log(`[Implementation] Finishing phase run: workflowId=${job.workflowId} status=AWAITING_USER`)
    await this.finishPhaseRun(
      job,
      {
        status: PhaseExecutionStatus.AWAITING_USER,
        runType: PhaseRunType.IMPLEMENTATION,
        branch,
        workspacePath: workspaceRemoved ? undefined : workspacePath,
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

    // The implementation may have run on another host, so review checks out the pushed branch itself.
    let worktree: Awaited<ReturnType<GitWorktreeService['prepareReviewWorktree']>> = null
    if (branch !== 'unknown') {
      const context = await this.loadWorkflowContext(job)
      worktree = await this.gitWorktree.prepareReviewWorktree({
        organizationId: job.organizationId,
        projectId: context.projectId,
        workflowId: job.workflowId,
        phaseKey: job.phaseKey,
        repository: context.repository,
        branch,
      })
    }

    if (worktree) {
      const result = await this.claudeCode.runReview({
        workspacePath: worktree.workspacePath,
        branch,
        workflowId: job.workflowId,
      })

      const workspaceRemoved = await this.cleanupWorktreeOnSuccess(worktree.mainRepoRoot, worktree.workspacePath)

      await this.finishPhaseRun(
        job,
        {
          status: PhaseExecutionStatus.AWAITING_USER,
          runType: PhaseRunType.REVIEW,
          branch,
          workspacePath: workspaceRemoved ? undefined : worktree.workspacePath,
          finishedAt: new Date().toISOString(),
        },
        { reviewSummary: result.content.slice(0, 12_000) }
      )
      return
    }

    const reviewSummary = `Review skipped: branch \`${branch}\` was not pushed, so there is nothing to review.`
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

  private async loadWorkflowContext(job: WorkflowPhaseRunJob): Promise<WorkflowRunContext> {
    const workflow = await this.databaseService.client.workflow.findFirst({
      where: { id: job.workflowId, organizationId: job.organizationId },
    })
    if (!workflow) {
      throw new Error('Workflow not found for phase run')
    }

    const link = await this.databaseService.client.workflowRepository.findFirst({
      where: { workflowId: job.workflowId, organizationId: job.organizationId },
    })
    if (!link) {
      throw new WorkspacePreparationError('Workflow has no linked repository')
    }

    const repo = await this.databaseService.client.gitRepository.findFirst({
      where: { id: link.repositoryId, organizationId: job.organizationId },
    })
    if (!repo) {
      throw new WorkspacePreparationError(`Linked repository not found: ${link.repositoryId}`)
    }

    return {
      projectId: workflow.projectId,
      repository: {
        organizationId: repo.organizationId,
        projectId: repo.projectId,
        name: repo.name,
        url: repo.url,
        branch: repo.branch,
      },
    }
  }

  private async commitWorkspaceChanges(workspacePath: string, workflowId: string): Promise<string | null> {
    try {
      const status = await this.repoCache.runGit(['status', '--porcelain'], { cwd: workspacePath })
      if (!status.trim()) {
        return null
      }
      const identity = this.configService.git
      await this.repoCache.runGit(['add', '-A'], { cwd: workspacePath })
      await this.repoCache.runGit(
        [
          '-c',
          `user.name=${identity.userName}`,
          '-c',
          `user.email=${identity.userEmail}`,
          'commit',
          '-m',
          `feat(workflow): implementation for ${workflowId.slice(0, 8)}`,
        ],
        { cwd: workspacePath }
      )
      const sha = await this.repoCache.runGit(['rev-parse', 'HEAD'], { cwd: workspacePath })
      return sha.trim()
    } catch (error) {
      this.logger.warn(`[Implementation] Commit failed: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  private async pushBranch(workspacePath: string, branch: string, remoteUrl: string): Promise<boolean> {
    try {
      await this.repoCache.runGit(['push', '-u', 'origin', branch], { cwd: workspacePath, remoteUrl })
      return true
    } catch (error) {
      // Log but don't fail - user can push manually
      this.logger.error(`Failed to push branch: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  /** Remove the worktree after a successful run when configured. Returns true when the directory is gone. */
  private async cleanupWorktreeOnSuccess(mainRepoRoot: string, workspacePath: string): Promise<boolean> {
    if (this.configService.workspace?.cleanupOnSuccess !== true) {
      return false
    }
    try {
      await this.gitWorktree.removeWorktree(mainRepoRoot, workspacePath)
      return true
    } catch (error) {
      this.logger.warn(
        `[Workspace] Failed to remove worktree ${workspacePath}: ${error instanceof Error ? error.message : String(error)}`
      )
      return false
    }
  }

  private async createPullRequest(
    workspacePath: string,
    branch: string,
    baseBranch: string,
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

      // Get GitHub App token
      let token: string | undefined
      const installationId = this.configService.git?.githubApp?.installationId
      if (this.githubAuthService && installationId) {
        try {
          token = await this.githubAuthService.getToken(installationId)
        } catch (error) {
          this.logger.warn(`Failed to get GitHub App token: ${error instanceof Error ? error.message : String(error)}`)
          // Continue without token; gh CLI might fail but we log it
        }
      }

      // Create PR using gh CLI
      const { stdout } = await execFileAsync(
        'gh',
        ['pr', 'create', '--title', title, '--body', body, '--base', baseBranch, '--head', branch],
        { cwd: workspacePath, env: token ? { ...process.env, GH_TOKEN: token } : process.env }
      )

      // Extract PR URL from output
      const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/)
      const url = urlMatch?.[0]

      // Extract PR number from URL
      const numberMatch = url?.match(/\/pull\/(\d+)/)
      const number = numberMatch ? parseInt(numberMatch[1], 10) : undefined

      return { url, number }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // Redact GitHub App tokens (ghs_) from error messages
      const redacted = message.replace(/ghs_[A-Za-z0-9_]+/g, 'ghs_***')
      this.logger.error(`Failed to create PR: ${redacted}`)
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
