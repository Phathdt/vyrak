import { z } from 'zod'
export declare const PhaseExecutionStatus: {
  readonly IDLE: 'IDLE'
  readonly RUNNING: 'RUNNING'
  readonly AWAITING_USER: 'AWAITING_USER'
  readonly SUCCEEDED: 'SUCCEEDED'
  readonly FAILED: 'FAILED'
}
export type PhaseExecutionStatus = (typeof PhaseExecutionStatus)[keyof typeof PhaseExecutionStatus]
export declare const PhaseRunType: {
  readonly IMPLEMENTATION: 'IMPLEMENTATION'
  readonly REVIEW: 'REVIEW'
  readonly QA: 'QA'
}
export type PhaseRunType = (typeof PhaseRunType)[keyof typeof PhaseRunType]
export declare const PhaseExecutionMetaSchema: z.ZodObject<
  {
    status: z.ZodEnum<{
      AWAITING_USER: 'AWAITING_USER'
      FAILED: 'FAILED'
      IDLE: 'IDLE'
      RUNNING: 'RUNNING'
      SUCCEEDED: 'SUCCEEDED'
    }>
    runType: z.ZodOptional<
      z.ZodEnum<{
        IMPLEMENTATION: 'IMPLEMENTATION'
        QA: 'QA'
        REVIEW: 'REVIEW'
      }>
    >
    branch: z.ZodOptional<z.ZodString>
    workspacePath: z.ZodOptional<z.ZodString>
    pullRequestUrl: z.ZodOptional<z.ZodString>
    pullRequestNumber: z.ZodOptional<z.ZodNumber>
    planArtifactId: z.ZodOptional<z.ZodString>
    reviewArtifactId: z.ZodOptional<z.ZodString>
    lastError: z.ZodOptional<z.ZodString>
    startedAt: z.ZodOptional<z.ZodString>
    finishedAt: z.ZodOptional<z.ZodString>
    updatedAt: z.ZodString
  },
  z.core.$strip
>
export type PhaseExecutionMeta = z.infer<typeof PhaseExecutionMetaSchema>
export declare const WorkflowPhaseRunJobSchema: z.ZodObject<
  {
    organizationId: z.ZodString
    workflowId: z.ZodString
    phaseId: z.ZodString
    phaseKey: z.ZodString
    runType: z.ZodEnum<{
      IMPLEMENTATION: 'IMPLEMENTATION'
      QA: 'QA'
      REVIEW: 'REVIEW'
    }>
  },
  z.core.$strip
>
export type WorkflowPhaseRunJob = z.infer<typeof WorkflowPhaseRunJobSchema>
//# sourceMappingURL=phase-execution.schemas.d.ts.map
