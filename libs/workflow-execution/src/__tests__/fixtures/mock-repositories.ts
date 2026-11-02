/**
 * Mock Repositories for Workflow Execution Tests
 */

import { SubTaskStatus } from '@vyrak/workflow-core'

import type {
  IWorkflowRepository,
  IWorkflowPhaseRepository,
  ISubTaskRepository,
  IWorkflowDependencyRepository,
  WorkflowEntity,
  WorkflowPhaseEntity,
  SubTaskEntity,
  WorkflowDependencyEntity,
} from '@vyrak/workflow-core'

export class MockWorkflowRepository implements Partial<IWorkflowRepository> {
  private workflows: Map<string, WorkflowEntity> = new Map()

  setWorkflows(workflows: WorkflowEntity[]): void {
    workflows.forEach((w) => this.workflows.set(w.id, w))
  }

  async findById(id: string): Promise<WorkflowEntity | null> {
    return this.workflows.get(id) || null
  }

  async update(id: string, data: Partial<WorkflowEntity>): Promise<WorkflowEntity> {
    const workflow = this.workflows.get(id)
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`)
    }
    const updated = { ...workflow, ...data, updatedAt: new Date() }
    this.workflows.set(id, updated)
    return updated
  }
}

export class MockWorkflowPhaseRepository implements Partial<IWorkflowPhaseRepository> {
  private phases: Map<string, WorkflowPhaseEntity> = new Map()

  setPhases(phases: WorkflowPhaseEntity[]): void {
    phases.forEach((p) => this.phases.set(p.id, p))
  }

  async findById(id: string): Promise<WorkflowPhaseEntity | null> {
    return this.phases.get(id) || null
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowPhaseEntity[]> {
    return Array.from(this.phases.values()).filter((p) => p.workflowId === workflowId)
  }

  async findByWorkflowIdAndKey(workflowId: string, key: string): Promise<WorkflowPhaseEntity | null> {
    return Array.from(this.phases.values()).find((p) => p.workflowId === workflowId && p.key === key) || null
  }

  async update(id: string, data: Partial<WorkflowPhaseEntity>): Promise<WorkflowPhaseEntity> {
    const phase = this.phases.get(id)
    if (!phase) {
      throw new Error(`Phase ${id} not found`)
    }
    const updated = { ...phase, ...data, updatedAt: new Date() }
    this.phases.set(id, updated)
    return updated
  }
}

export class MockSubTaskRepository implements Partial<ISubTaskRepository> {
  private subTasks: Map<string, SubTaskEntity> = new Map()

  setSubTasks(tasks: SubTaskEntity[]): void {
    tasks.forEach((t) => this.subTasks.set(t.id, t))
  }

  async findById(id: string): Promise<SubTaskEntity | null> {
    return this.subTasks.get(id) || null
  }

  async findByPhaseId(phaseId: string): Promise<SubTaskEntity[]> {
    return Array.from(this.subTasks.values()).filter((t) => t.phaseId === phaseId)
  }

  async findByWorkflowId(workflowId: string): Promise<SubTaskEntity[]> {
    return Array.from(this.subTasks.values()).filter((t) => t.workflowId === workflowId)
  }

  async findReadyTasks(workflowId: string): Promise<SubTaskEntity[]> {
    // Simplified: return tasks with READY or PENDING status
    return Array.from(this.subTasks.values()).filter(
      (t) => t.workflowId === workflowId && (t.status === SubTaskStatus.READY || t.status === SubTaskStatus.PENDING)
    )
  }

  async updateStatus(id: string, status: unknown): Promise<void> {
    const task = this.subTasks.get(id)
    if (!task) {
      throw new Error(`SubTask ${id} not found`)
    }
    const updated = { ...task, status: status as SubTaskStatus, updatedAt: new Date() }
    this.subTasks.set(id, updated)
  }

  async update(id: string, data: Partial<SubTaskEntity>): Promise<SubTaskEntity> {
    const task = this.subTasks.get(id)
    if (!task) {
      throw new Error(`SubTask ${id} not found`)
    }
    const updated = { ...task, ...data, updatedAt: new Date() }
    this.subTasks.set(id, updated)
    return updated
  }
}

export class MockWorkflowDependencyRepository implements Partial<IWorkflowDependencyRepository> {
  private dependencies: WorkflowDependencyEntity[] = []

  setDependencies(deps: WorkflowDependencyEntity[]): void {
    this.dependencies = [...deps]
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowDependencyEntity[]> {
    return this.dependencies.filter((d) => d.workflowId === workflowId)
  }

  async findDependenciesForTask(taskId: string): Promise<WorkflowDependencyEntity[]> {
    return this.dependencies.filter((d) => d.dependentItemId === taskId)
  }
}

export class MockArtifactService {
  private artifacts: Map<string, Record<string, unknown>> = new Map()

  setArtifacts(artifacts: Record<string, unknown>[]): void {
    artifacts.forEach((a) => this.artifacts.set(a.id as string, a))
  }

  async getArtifactById(id: string): Promise<unknown | null> {
    return this.artifacts.get(id) || null
  }

  async getArtifactsByWorkflowId(workflowId: string): Promise<unknown[]> {
    return Array.from(this.artifacts.values()).filter((a) => a.workflowId === workflowId)
  }

  async getArtifactsByPhaseId(phaseId: string): Promise<unknown[]> {
    return Array.from(this.artifacts.values()).filter((a) => a.phaseId === phaseId)
  }

  async getArtifactByWorkflowIdAndKey(workflowId: string, key: string): Promise<unknown | null> {
    return Array.from(this.artifacts.values()).find((a) => a.workflowId === workflowId && a.key === key) || null
  }

  async createArtifact(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const artifact = {
      id: `artifact-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }
    this.artifacts.set(artifact.id, artifact)
    return artifact
  }

  async downloadArtifact(artifactId: string): Promise<Buffer> {
    const artifact = this.artifacts.get(artifactId)
    if (!artifact) {
      throw new Error(`Artifact ${artifactId} not found`)
    }
    // Return mock content based on artifact type
    return Buffer.from((artifact.mockContent as string) || 'Mock artifact content')
  }
}

export class MockAIAgentService {
  private mockResponses: Map<string, string> = new Map()

  setMockResponse(key: string, response: string): void {
    this.mockResponses.set(key, response)
  }

  async runAgent(prompt: string, _options?: unknown): Promise<string> {
    // Return mock response based on prompt content
    if (prompt.includes('planning') || prompt.includes('PRD')) {
      return this.mockResponses.get('planning') || 'Mock planning response'
    }
    if (prompt.includes('implementation')) {
      return this.mockResponses.get('implementation') || 'Mock implementation response'
    }
    if (prompt.includes('code review')) {
      return this.mockResponses.get('code-review') || 'Mock code review response'
    }
    if (prompt.includes('QA')) {
      return this.mockResponses.get('qa') || 'Mock QA response'
    }
    return 'Mock agent response'
  }

  async chat(_sessionId: string, message: string): Promise<string> {
    return this.runAgent(message)
  }
}

export class MockConfigService {
  private config: Record<string, unknown> = {
    workspace: {
      mode: 'clone',
      workspacesPath: '/tmp/test-workspaces',
      mainReposPath: '/tmp/test-repos',
      cleanupOnSuccess: false,
      cleanupOnFailure: false,
    },
    agent: {
      maxTurns: 10,
      timeout: 60000,
    },
  }

  get(key: string): unknown {
    return this.config[key]
  }

  set(key: string, value: unknown): void {
    this.config[key] = value
  }
}

export class MockLogger {
  log(_message: string, ..._args: unknown[]): void {
    // Silent in tests
  }

  info(_message: string, ..._args: unknown[]): void {
    // Silent in tests
  }

  warn(_message: string, ..._args: unknown[]): void {
    // Silent in tests
  }

  error(_message: string, ..._args: unknown[]): void {
    // Silent in tests
  }

  debug(_message: string, ..._args: unknown[]): void {
    // Silent in tests
  }
}
