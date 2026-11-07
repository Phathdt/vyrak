export interface IWorkflowPhaseOrchestrator {
  /**
   * Start automated execution for a workflow phase.
   * Publishes a job to the queue for async processing.
   */
  startAutomationForPhase(workflowId: string, phaseKey: string): Promise<void>
}
