import type { StepRun } from '@vyrak/workflow-core'

import type { StepRunResponseDto } from '../dto'

export function toStepRunResponseDto(step: StepRun): StepRunResponseDto {
  return {
    id: step.id,
    runId: step.runId,
    stepKey: step.stepKey,
    status: step.status,
    attempt: step.attempt,
    startedAt: step.startedAt?.toISOString() ?? null,
    completedAt: step.completedAt?.toISOString() ?? null,
    errorMessage: step.errorMessage ?? null,
    outputArtifactId: null, // TODO: Add outputArtifactId to StepRun entity if needed
  }
}
