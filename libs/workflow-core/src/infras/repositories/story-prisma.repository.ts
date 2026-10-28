import { Prisma, type DatabaseService, type Story } from '@vyrak/database'

import type {
  CreateStoryData,
  IStoryRepository,
  SubStepData,
  UpdateStoryStatusData,
} from '../../domain/interfaces/story.repository.interface'

export class StoryPrismaRepository implements IStoryRepository {
  constructor(private readonly db: DatabaseService) {}

  async createMany(stories: CreateStoryData[]): Promise<Story[]> {
    const created = await this.db.client.$transaction(
      stories.map((story) =>
        this.db.client.story.create({
          data: {
            workflowRunId: story.workflowRunId,
            orderIndex: story.orderIndex,
            title: story.title,
            description: story.description,
            acceptanceCriteria: (story.acceptanceCriteria ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            estimatedDuration: story.estimatedDuration,
            status: 'queued',
            subSteps: [] as Prisma.InputJsonValue,
          },
        })
      )
    )

    return created
  }

  async findByWorkflowRunId(workflowRunId: string): Promise<Story[]> {
    return this.db.client.story.findMany({
      where: { workflowRunId },
      orderBy: { orderIndex: 'asc' },
    })
  }

  async findById(storyId: string): Promise<Story | null> {
    return this.db.client.story.findUnique({
      where: { id: storyId },
    })
  }

  async updateStatus(storyId: string, data: UpdateStoryStatusData): Promise<Story> {
    return this.db.client.story.update({
      where: { id: storyId },
      data: {
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        duration: data.duration,
      },
    })
  }

  async appendSubStep(storyId: string, subStep: SubStepData): Promise<Story> {
    const story = await this.db.client.story.findUnique({
      where: { id: storyId },
      select: { subSteps: true },
    })

    if (!story) {
      throw new Error(`Story ${storyId} not found`)
    }

    const currentSubSteps = Array.isArray(story.subSteps) ? story.subSteps : []
    const updatedSubSteps = [...currentSubSteps, subStep]

    return this.db.client.story.update({
      where: { id: storyId },
      data: { subSteps: updatedSubSteps as Prisma.InputJsonValue },
    })
  }

  async saveArtifacts(storyId: string, artifacts: unknown): Promise<Story> {
    return this.db.client.story.update({
      where: { id: storyId },
      data: { artifacts: (artifacts ?? Prisma.JsonNull) as Prisma.InputJsonValue },
    })
  }

  async skip(storyId: string, reason: string): Promise<Story> {
    return this.db.client.story.update({
      where: { id: storyId },
      data: {
        status: 'skipped',
        error: reason,
      },
    })
  }

  async retry(storyId: string): Promise<Story> {
    return this.db.client.story.update({
      where: { id: storyId },
      data: {
        status: 'queued',
        error: null,
        startedAt: null,
        completedAt: null,
        duration: null,
      },
    })
  }

  async updateSubStep(storyId: string, subStepName: string, status: string, error?: string): Promise<Story> {
    const story = await this.db.client.story.findUnique({
      where: { id: storyId },
      select: { subSteps: true },
    })

    if (!story) {
      throw new Error(`Story ${storyId} not found`)
    }

    const currentSubSteps = Array.isArray(story.subSteps) ? (story.subSteps as unknown as SubStepData[]) : []
    const subStepIndex = currentSubSteps.findIndex((s: SubStepData) => s.name === subStepName)

    if (subStepIndex === -1) {
      throw new Error(`Sub-step ${subStepName} not found in story ${storyId}`)
    }

    const updatedSubSteps = [...currentSubSteps]
    updatedSubSteps[subStepIndex] = {
      ...updatedSubSteps[subStepIndex],
      status: status as SubStepData['status'],
      completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
      error,
    }

    return this.db.client.story.update({
      where: { id: storyId },
      data: { subSteps: updatedSubSteps as unknown as Prisma.InputJsonValue },
    })
  }
}
