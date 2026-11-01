import { WorkflowType } from './entities'

export type PhaseDefinitionTemplate = {
  key: string
  name: string
  sequence: number
}

/**
 * Default phase pipeline - 6 fixed phases (PRD Section 3).
 * Brainstorm and Classify phases are disabled for MVP.
 * Phases are automatically created when workflow is initialized.
 */
export const DEFAULT_WORKFLOW_PHASE_DEFINITIONS: PhaseDefinitionTemplate[] = [
  { key: 'planning', name: 'Planning', sequence: 1 },
  { key: 'technical-refinement', name: 'Technical Refinement', sequence: 2 },
  { key: 'implementation', name: 'Implementation', sequence: 3 },
  { key: 'code-review', name: 'Code Review', sequence: 4 },
  { key: 'qa', name: 'QA', sequence: 5 },
  { key: 'completed', name: 'Completed', sequence: 6 },
]

export function buildDefinitionSnapshot(workflowType: WorkflowType): Record<string, unknown> {
  return {
    workflowType,
    version: 1,
    phases: DEFAULT_WORKFLOW_PHASE_DEFINITIONS.map((phase) => ({ ...phase })),
    createdAt: new Date().toISOString(),
  }
}
