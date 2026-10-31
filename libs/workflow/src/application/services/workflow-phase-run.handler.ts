import { ConversationPhase, ConversationService, MessageRole } from '@vyrak/conversation'
import { CustomConfigService } from '@vyrak/custom-config'
import { DatabaseService } from '@vyrak/database'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import { PhaseExecutionStatus, PhaseRunType } from '../../domain/schemas/phase-execution.schemas'

import type { PhaseExecutionMeta, WorkflowPhaseRunJob } from '../../domain/schemas/phase-execution.schemas'

const execFileAsync = promisify(execFile)

export class WorkflowPhaseRunHandler {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly conversationService: ConversationService,
    private readonly configService: CustomConfigService
  ) {}

  async handle(job: WorkflowPhaseRunJob): Promise<void> {
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
  }

  private async runImplementation(job: WorkflowPhaseRunJob): Promise<void> {
    const planText = await this.buildPlanningTranscript(job.workflowId)
    const branch = `workflow/${job.workflowId.slice(0, 8)}/implementation`
    const workspacePath = await this.prepareWorkspace(job, branch)

    // TODO: invoke Claude Code agent in workspacePath with planText
    await writeFile(path.join(workspacePath, '.vyrak-plan.md'), planText, 'utf8')

    const pullRequestUrl = `https://github.com/example/org/pull/${Math.floor(Math.random() * 9000) + 1000}`

    await this.finishPhaseRun(job, {
      status: PhaseExecutionStatus.AWAITING_USER,
      runType: PhaseRunType.IMPLEMENTATION,
      branch,
      workspacePath,
      pullRequestUrl,
      pullRequestNumber: Number(pullRequestUrl.split('/').pop()),
      finishedAt: new Date().toISOString(),
    })
  }

  private async runReview(job: WorkflowPhaseRunJob): Promise<void> {
    const implPhase = await this.databaseService.client.workflowPhase.findFirst({
      where: { workflowId: job.workflowId, key: 'implementation', organizationId: job.organizationId },
    })
    const implOutput = (implPhase?.output ?? {}) as { execution?: PhaseExecutionMeta }
    const branch = implOutput.execution?.branch ?? 'unknown'

    // TODO: Claude Code review on branch with criteria checklist
    const reviewSummary = `Review (stub) for branch \`${branch}\`: no blocking issues found. Verify tests and security manually.`

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
    // TODO: run test suite in workspace
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

  private async prepareWorkspace(job: WorkflowPhaseRunJob, branch: string): Promise<string> {
    const workspacesPath = this.configService.workspace?.workspacesPath ?? '/tmp/vyrak-workspaces'
    const workspacePath = path.join(workspacesPath, job.organizationId, job.workflowId, job.phaseKey)
    await mkdir(workspacePath, { recursive: true })

    const mainReposPath = this.configService.workspace?.mainReposPath
    if (mainReposPath) {
      try {
        await execFileAsync('git', ['worktree', 'add', '-B', branch, workspacePath, 'HEAD'], {
          cwd: mainReposPath,
        })
        return workspacePath
      } catch {
        // fall through — stub workspace without git
      }
    }

    await writeFile(
      path.join(workspacePath, 'README.vyrak-stub'),
      `Stub workspace for workflow ${job.workflowId}\nBranch: ${branch}\n`,
      'utf8'
    )
    return workspacePath
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
