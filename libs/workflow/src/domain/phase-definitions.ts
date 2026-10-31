import { WorkflowType } from './entities'

export type PhaseDefinitionTemplate = {
  key: string
  name: string
  sequence: number
}

/** Default phase pipeline (PRD FR-06). Snapshot per workflow at confirmation time. */
export const DEFAULT_WORKFLOW_PHASE_DEFINITIONS: PhaseDefinitionTemplate[] = [
  { key: 'planning', name: 'Planning', sequence: 1 },
  { key: 'implementation', name: 'Implementation', sequence: 2 },
  { key: 'review', name: 'Review', sequence: 3 },
  { key: 'qc', name: 'QC', sequence: 4 },
]

export function buildDefinitionSnapshot(workflowType: WorkflowType): Record<string, unknown> {
  return {
    workflowType,
    version: 1,
    phases: DEFAULT_WORKFLOW_PHASE_DEFINITIONS.map((phase) => ({ ...phase })),
    createdAt: new Date().toISOString(),
  }
}
