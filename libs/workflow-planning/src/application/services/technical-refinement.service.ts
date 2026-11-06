import { AnthropicApiAdapter } from '@vyrak/ai-agent'
import { IArtifactService } from '@vyrak/artifact'
import { ConversationPhase, IConversationService, MessageRole } from '@vyrak/conversation'
import {
  InvalidPlanningStateError,
  WorkflowNotFoundError,
  WorkflowStatus,
  IWorkflowDependencyRepository,
  IWorkflowPhaseRepository,
  IWorkflowWorkItemRepository,
  CyclicDependencyError,
  WorkflowWorkItemType,
} from '@vyrak/workflow-core'

import { ImplementationPlanNotFoundError } from '../../domain/exceptions'
import { ParsedImplementationTask } from '../../infras/parsers'

import type { ITechnicalRefinementService } from '../../domain/interfaces/technical-refinement-service.interface'
import type {
  TechnicalRefinementSessionResponseDto,
  GenerateArtifactsResponseDto,
  GenerateSubTasksResponseDto,
  SubTasksListResponseDto,
} from '../../domain/schemas/technical-refinement.schemas'
import type { IConfigService } from '@vyrak/custom-config'
import type { IGitRepositoryService } from '@vyrak/project'
import type { IWorkflowRepository, IWorkflowRepositoryRepository, WorkflowRepositoryEntity } from '@vyrak/workflow-core'

/**
 * Returns one cycle (as a list of item ids, first id repeated at the end) or null.
 * Edges are [dependentId, dependsOnId].
 */
function findDependencyCycle(edges: Array<[string, string]>): string[] | null {
  const adjacency = new Map<string, string[]>()
  for (const [from, to] of edges) {
    const list = adjacency.get(from) ?? []
    list.push(to)
    adjacency.set(from, list)
  }

  const state = new Map<string, 'visiting' | 'done'>()
  const path: string[] = []

  const visit = (node: string): string[] | null => {
    state.set(node, 'visiting')
    path.push(node)
    for (const next of adjacency.get(node) ?? []) {
      if (state.get(next) === 'visiting') {
        return [...path.slice(path.indexOf(next)), next]
      }
      if (!state.has(next)) {
        const found = visit(next)
        if (found) return found
      }
    }
    path.pop()
    state.set(node, 'done')
    return null
  }

  for (const node of adjacency.keys()) {
    if (!state.has(node)) {
      const found = visit(node)
      if (found) return found
    }
  }
  return null
}

function readExecutionOrder(metadata: Record<string, unknown> | null, fallback: number): number {
  const value = metadata?.executionOrder
  return typeof value === 'number' ? value : fallback
}

export class TechnicalRefinementService implements ITechnicalRefinementService {
  private readonly anthropicAdapter: AnthropicApiAdapter

  constructor(
    private readonly conversationService: IConversationService,
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly gitRepositoryService: IGitRepositoryService,
    private readonly artifactService: IArtifactService,
    private readonly workItemRepository: IWorkflowWorkItemRepository,
    private readonly workflowDependencyRepository: IWorkflowDependencyRepository,
    private readonly workflowPhaseRepository: IWorkflowPhaseRepository,
    private readonly configService: IConfigService
  ) {
    const anthropicConfig = this.configService.anthropic
    if (!anthropicConfig?.model) {
      throw new Error('ANTHROPIC__MODEL not configured in .env')
    }
    this.anthropicAdapter = new AnthropicApiAdapter(configService)
  }

  async getTechnicalRefinementSession(
    workflowId: string,
    organizationId: string,
    projectId: string
  ): Promise<TechnicalRefinementSessionResponseDto> {
    await this.ensureTechnicalRefinementPhase(workflowId)

    const repositories = await this.loadLinkedRepositories(organizationId, projectId, workflowId)
    const sessions = await this.conversationService.getWorkflowSessions(workflowId)
    const session = this.pickTechnicalRefinementSession(sessions)

    // Load PRD artifact from Planning phase
    const prdArtifact = await this.loadPRDArtifact(workflowId)

    if (!session) {
      return {
        sessionId: null,
        messages: [],
        messageCount: 0,
        repositories,
        prdArtifact,
      }
    }

    const messages = await this.conversationService.getMessages(session.id)

    return {
      sessionId: session.id,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
      messageCount: messages.length,
      repositories,
      prdArtifact,
    }
  }

  async generateTechnicalArtifacts(workflowId: string, _sessionId: string): Promise<GenerateArtifactsResponseDto> {
    await this.ensureTechnicalRefinementPhase(workflowId)

    // Get conversation history
    const messages = await this.conversationService.getMessages(_sessionId)

    // Combine all assistant messages for artifact parsing
    const conversationText = messages
      .filter((msg) => msg.role === MessageRole.ASSISTANT)
      .map((msg) => msg.content)
      .join('\n\n')

    // Parse artifacts from conversation
    const parsedArtifacts = this.artifactService.parseArtifactTags(conversationText)

    // Filter for technical artifacts: ADR, ARD, Implementation Plan
    const technicalTypes = ['adr', 'ard', 'implementation-plan']
    const technicalArtifacts = parsedArtifacts.filter((artifact) => technicalTypes.includes(artifact.type))

    if (technicalArtifacts.length === 0) {
      return {
        artifacts: [],
        count: 0,
        types: [],
      }
    }

    // Get workflow's Technical Refinement phase ID
    const workflow = await this.workflowRepository.findById(workflowId)
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId)
    }

    // Find Technical Refinement phase
    const phases = await this.workflowPhaseRepository.findByWorkflowId(workflowId)
    const techRefinementPhase = phases.find((p: { key: string }) => p.key === 'technical-refinement')

    // Create artifacts in storage
    const createdArtifacts = []
    for (const parsed of technicalArtifacts) {
      const artifact = await this.artifactService.uploadArtifact(
        workflowId,
        parsed.type,
        parsed.key,
        parsed.title,
        parsed.content,
        {
          phaseId: techRefinementPhase?.id || null,
          mimeType: parsed.format === 'markdown' ? 'text/markdown' : 'text/plain',
        }
      )

      createdArtifacts.push({
        id: artifact.id,
        type: artifact.type,
        key: artifact.key,
        title: artifact.title,
        version: artifact.version,
      })
    }

    // Get unique artifact types
    const uniqueTypes = Array.from(new Set(createdArtifacts.map((a) => a.type)))

    return {
      artifacts: createdArtifacts,
      count: createdArtifacts.length,
      types: uniqueTypes,
    }
  }

  async generateSubTasks(workflowId: string, _sessionId: string): Promise<GenerateSubTasksResponseDto> {
    await this.ensureTechnicalRefinementPhase(workflowId)

    const workflow = await this.workflowRepository.findById(workflowId)
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId)
    }

    const artifacts = await this.artifactService.listWorkflowArtifacts(workflowId, {
      type: 'implementation-plan',
    })

    if (artifacts.length === 0) {
      throw new ImplementationPlanNotFoundError(workflowId)
    }

    const latestPlan = [...artifacts].sort((a, b) => b.version - a.version)[0]
    const { content: planContent } = await this.artifactService.downloadArtifact(latestPlan.id)

    // Use Claude API to parse Implementation Plan intelligently
    const parsedTasks = await this.parseImplementationPlanWithClaude(planContent)
    if (parsedTasks.length === 0) {
      return { subTasks: [], count: 0, dependencyCount: 0 }
    }

    const phases = await this.workflowPhaseRepository.findByWorkflowId(workflowId)
    const techRefinementPhase = phases.find((p: { key: string }) => p.key === 'technical-refinement')

    // Idempotency: existing work items for this workflow are reused by key, never duplicated.
    const existingItems = await this.workItemRepository.findByWorkflowId(workflowId)
    const itemByKey = new Map(existingItems.map((item) => [item.key, item]))
    const existingDependencies = await this.workflowDependencyRepository.findByWorkflowId(workflowId)
    const existingEdges = new Set(existingDependencies.map((d) => `${d.dependentItemId}->${d.dependsOnItemId}`))

    const createdItems: Array<{
      id: string
      key: string
      title: string
      description: string | null
      dependencies: string[]
    }> = []
    for (const parsed of parsedTasks) {
      if (itemByKey.has(parsed.key)) continue

      const item = await this.workItemRepository.create(workflowId, {
        key: parsed.key,
        type: WorkflowWorkItemType.TASK,
        title: parsed.title,
        description: parsed.description || null,
        acceptanceCriteria: parsed.acceptanceCriteria.length ? { items: parsed.acceptanceCriteria } : null,
        estimate: parsed.estimate ? { value: parsed.estimate } : null,
        sequence: parsed.executionOrder,
        metadata: {
          phaseId: techRefinementPhase?.id ?? null,
          phaseKey: parsed.phaseKey,
          phaseTitle: parsed.phaseTitle,
          taskOrder: parsed.taskOrder,
          executionOrder: parsed.executionOrder,
          isParallel: parsed.isParallel,
          files: parsed.files,
        },
      })

      itemByKey.set(parsed.key, item)
      createdItems.push({
        id: item.id,
        key: item.key,
        title: item.title,
        description: item.description,
        dependencies: parsed.dependencyKeys,
      })
    }

    let dependencyCount = 0
    for (const parsed of parsedTasks) {
      const dependent = itemByKey.get(parsed.key)
      if (!dependent) continue

      for (const depKey of parsed.dependencyKeys) {
        const dependsOn = itemByKey.get(depKey)
        if (!dependsOn) continue

        const edge = `${dependent.id}->${dependsOn.id}`
        if (existingEdges.has(edge)) continue

        await this.workflowDependencyRepository.create(workflowId, dependent.id, dependsOn.id, 'BLOCKS')
        existingEdges.add(edge)
        dependencyCount++
      }
    }

    const allDependencies = await this.workflowDependencyRepository.findByWorkflowId(workflowId)
    const cycle = findDependencyCycle(allDependencies.map((d) => [d.dependentItemId, d.dependsOnItemId]))
    if (cycle) {
      throw new CyclicDependencyError(cycle)
    }

    return {
      subTasks: createdItems,
      count: createdItems.length,
      dependencyCount,
    }
  }

  async listSubTasks(workflowId: string): Promise<SubTasksListResponseDto> {
    const workflow = await this.workflowRepository.findById(workflowId)
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId)
    }

    const [items, dependencies] = await Promise.all([
      this.workItemRepository.findByWorkflowId(workflowId),
      this.workflowDependencyRepository.findByWorkflowId(workflowId),
    ])

    const keyById = new Map(items.map((item) => [item.id, item.key]))
    const dependencyKeysByTaskId = new Map<string, string[]>()
    for (const dep of dependencies) {
      const depKey = keyById.get(dep.dependsOnItemId)
      if (!depKey) continue
      const existing = dependencyKeysByTaskId.get(dep.dependentItemId) ?? []
      existing.push(depKey)
      dependencyKeysByTaskId.set(dep.dependentItemId, existing)
    }

    const tasks = items
      .map((item) => ({
        id: item.id,
        key: item.key,
        title: item.title,
        description: item.description,
        status: item.status,
        executionOrder: readExecutionOrder(item.metadata, item.sequence),
        dependencies: dependencyKeysByTaskId.get(item.id) ?? [],
      }))
      .sort((a, b) => a.executionOrder - b.executionOrder)

    return { tasks, count: tasks.length }
  }

  // Private helper methods

  private pickTechnicalRefinementSession(sessions: Awaited<ReturnType<IConversationService['getWorkflowSessions']>>) {
    return (
      sessions.find((s) => s.phase === ConversationPhase.TECHNICAL_REFINEMENT) ??
      [...sessions]
        .filter((s) => s.phase === ConversationPhase.TECHNICAL_REFINEMENT)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]
    )
  }

  private async ensureTechnicalRefinementPhase(workflowId: string) {
    const workflow = await this.workflowRepository.findById(workflowId)
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId)
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new InvalidPlanningStateError('Technical Refinement chat is only available for active workflows')
    }

    if (workflow.currentPhaseKey && workflow.currentPhaseKey !== 'technical-refinement') {
      throw new InvalidPlanningStateError(
        'Technical Refinement chat is only available while the Technical Refinement phase is current'
      )
    }

    return workflow
  }

  private async loadLinkedRepositories(organizationId: string, projectId: string, workflowId: string) {
    const links = await this.workflowRepositoryRepository.findByWorkflowId(workflowId)
    const allRepos = await this.gitRepositoryService.findAllByProject(organizationId, projectId)
    const linkedIds = new Set(links.map((l: WorkflowRepositoryEntity) => l.repositoryId))

    return allRepos
      .filter((repo) => linkedIds.has(repo.id))
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        url: repo.url,
        branch: repo.branch,
      }))
  }

  private async loadPRDArtifact(workflowId: string): Promise<{ id: string; title: string; content: string } | null> {
    const prdArtifacts = await this.artifactService.listWorkflowArtifacts(workflowId, { type: 'prd' })

    if (prdArtifacts.length === 0) {
      return null
    }

    // Get latest version
    const latestPRD = prdArtifacts.sort((a, b) => b.version - a.version)[0]
    const { content } = await this.artifactService.downloadArtifact(latestPRD.id)

    return {
      id: latestPRD.id,
      title: latestPRD.title,
      content,
    }
  }

  private async parseImplementationPlanWithClaude(planContent: string): Promise<ParsedImplementationTask[]> {
    try {
      const prompt = `Analyze this Implementation Plan and extract Phases as sub-tasks.

IMPORTANT RULES:
1. Each Phase (e.g., "### Phase 1: Setup Dependencies") becomes ONE sub-task
2. Phase title becomes the task title
3. Extract the Goal, Duration, and Dependencies from each Phase section
4. The numbered tasks inside each Phase become acceptanceCriteria items
5. Return as JSON array with one entry per Phase

Implementation Plan:
${planContent}

Return JSON in this exact format:
{
  "tasks": [
    {
      "key": "phase-1",
      "title": "Setup Dependencies và Base Configuration",
      "description": "Goal from the phase description",
      "acceptanceCriteria": [
        "Cài đặt React Router DOM v7",
        "Cài đặt TanStack Query v5",
        "Cài đặt Axios cho HTTP client",
        "Tạo cấu trúc thư mục routing"
      ],
      "dependencyKeys": [],
      "phaseKey": "phase-1",
      "phaseTitle": "Setup Dependencies và Base Configuration",
      "phaseOrder": 1,
      "taskOrder": 1,
      "executionOrder": 1,
      "isParallel": false,
      "estimate": "0.5 day",
      "files": []
    },
    {
      "key": "phase-2",
      "title": "Setup TanStack Query Provider",
      "description": "Goal from phase 2",
      "acceptanceCriteria": [
        "Tạo QueryClient configuration",
        "Tạo Axios instance với interceptors",
        "Update main.tsx với QueryClientProvider",
        "Add TanStack Query DevTools"
      ],
      "dependencyKeys": ["phase-1"],
      "phaseKey": "phase-2",
      "phaseTitle": "Setup TanStack Query Provider",
      "phaseOrder": 2,
      "taskOrder": 2,
      "executionOrder": 2,
      "isParallel": false,
      "estimate": "0.5 day",
      "files": []
    }
  ]
}

CRITICAL: Extract PHASES as tasks, not individual checkbox items. One Phase = One Task.`

      const jsonResponse = await this.callAnthropicAPI(prompt)
      return jsonResponse.tasks || []
    } catch (error) {
      console.error('Failed to parse Implementation Plan with Claude:', error)
      // Fallback to regex parser
      const { parseImplementationPlan } = await import('../../infras/parsers')
      const { tasks } = parseImplementationPlan(planContent)
      return tasks
    }
  }

  private async callAnthropicAPI(prompt: string): Promise<{ tasks: ParsedImplementationTask[] }> {
    const response = await this.anthropicAdapter.chat({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: 8192,
    })

    const content = response.content

    // Extract JSON from markdown code block if present
    const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/) || content.match(/(\{[\s\S]+\})/)
    const jsonText = jsonMatch ? jsonMatch[1] : content

    return JSON.parse(jsonText.trim())
  }
}
