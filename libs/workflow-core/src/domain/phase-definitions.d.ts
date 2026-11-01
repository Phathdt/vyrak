import { WorkflowType } from './entities'
export type PhaseDefinitionTemplate = {
  key: string
  name: string
  sequence: number
}
/** Default phase pipeline (PRD FR-06). Snapshot per workflow at confirmation time. */
export declare const DEFAULT_WORKFLOW_PHASE_DEFINITIONS: PhaseDefinitionTemplate[]
export declare function buildDefinitionSnapshot(workflowType: WorkflowType): Record<string, unknown>
//# sourceMappingURL=phase-definitions.d.ts.map
