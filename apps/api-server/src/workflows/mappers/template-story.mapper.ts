import type { Story, WorkflowTemplate } from '@vyrak/database'

import type { StoryDto, WorkflowTemplateDto } from '../dto'

/**
 * Map WorkflowTemplate entity to DTO
 */
export function toWorkflowTemplateDto(template: WorkflowTemplate): WorkflowTemplateDto {
  return {
    id: template.id,
    key: template.key,
    name: template.name,
    description: template.description,
    icon: template.icon,
    storyBased: template.storyBased,
    phases: Array.isArray(template.phases)
      ? (template.phases as Array<{ key: string; name: string; description?: string; estimatedDuration?: number }>)
      : [],
    estimatedDuration:
      template.estimatedDurationMin !== null || template.estimatedDurationMax !== null
        ? {
            min: template.estimatedDurationMin,
            max: template.estimatedDurationMax,
          }
        : undefined,
    isActive: template.isActive,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }
}

/**
 * Map Story entity to DTO
 */
export function toStoryDto(story: Story): StoryDto {
  return {
    id: story.id,
    workflowRunId: story.workflowRunId,
    orderIndex: story.orderIndex,
    title: story.title,
    description: story.description,
    acceptanceCriteria: Array.isArray(story.acceptanceCriteria) ? (story.acceptanceCriteria as string[]) : undefined,
    estimatedDuration: story.estimatedDuration,
    status: story.status as 'queued' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'paused',
    startedAt: story.startedAt?.toISOString() ?? null,
    completedAt: story.completedAt?.toISOString() ?? null,
    duration: story.duration,
    error: story.error,
    artifacts: story.artifacts ? (story.artifacts as Record<string, unknown>) : null,
    subSteps: story.subSteps ? (story.subSteps as unknown[]) : null,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  }
}
