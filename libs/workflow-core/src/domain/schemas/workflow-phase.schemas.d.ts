import { z } from 'zod'

import { WorkflowPhaseStatus } from '../entities/workflow-phase.entity'
export declare const WorkflowPhaseResponseSchema: z.ZodObject<
  {
    id: z.ZodString
    workflowId: z.ZodString
    key: z.ZodString
    name: z.ZodString
    sequence: z.ZodNumber
    status: z.ZodEnum<{
      COMPLETED: 'COMPLETED'
      FAILED: 'FAILED'
      IN_PROGRESS: 'IN_PROGRESS'
      PENDING: 'PENDING'
      SKIPPED: 'SKIPPED'
      WAITING_APPROVAL: 'WAITING_APPROVAL'
    }>
    startedAt: z.ZodNullable<z.ZodString>
    completedAt: z.ZodNullable<z.ZodString>
    execution: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            status: z.ZodString
            runType: z.ZodOptional<z.ZodString>
            branch: z.ZodOptional<z.ZodString>
            workspacePath: z.ZodOptional<z.ZodString>
            pullRequestUrl: z.ZodOptional<z.ZodString>
            pullRequestNumber: z.ZodOptional<z.ZodNumber>
            lastError: z.ZodOptional<z.ZodString>
            updatedAt: z.ZodOptional<z.ZodString>
          },
          z.core.$strip
        >
      >
    >
    reviewSummary: z.ZodOptional<z.ZodString>
    commitSha: z.ZodOptional<z.ZodString>
  },
  z.core.$strip
>
declare const WorkflowPhaseResponseDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      id: z.ZodString
      workflowId: z.ZodString
      key: z.ZodString
      name: z.ZodString
      sequence: z.ZodNumber
      status: z.ZodEnum<{
        COMPLETED: 'COMPLETED'
        FAILED: 'FAILED'
        IN_PROGRESS: 'IN_PROGRESS'
        PENDING: 'PENDING'
        SKIPPED: 'SKIPPED'
        WAITING_APPROVAL: 'WAITING_APPROVAL'
      }>
      startedAt: z.ZodNullable<z.ZodString>
      completedAt: z.ZodNullable<z.ZodString>
      execution: z.ZodOptional<
        z.ZodNullable<
          z.ZodObject<
            {
              status: z.ZodString
              runType: z.ZodOptional<z.ZodString>
              branch: z.ZodOptional<z.ZodString>
              workspacePath: z.ZodOptional<z.ZodString>
              pullRequestUrl: z.ZodOptional<z.ZodString>
              pullRequestNumber: z.ZodOptional<z.ZodNumber>
              lastError: z.ZodOptional<z.ZodString>
              updatedAt: z.ZodOptional<z.ZodString>
            },
            z.core.$strip
          >
        >
      >
      reviewSummary: z.ZodOptional<z.ZodString>
      commitSha: z.ZodOptional<z.ZodString>
    },
    z.core.$strip
  >,
  false
>
export declare class WorkflowPhaseResponseDto extends WorkflowPhaseResponseDto_base {
  id: string
  workflowId: string
  key: string
  name: string
  sequence: number
  status: WorkflowPhaseStatus
  startedAt: string | null
  completedAt: string | null
  execution?: {
    status: string
    runType?: string
    branch?: string
    workspacePath?: string
    pullRequestUrl?: string
    pullRequestNumber?: number
    lastError?: string
    updatedAt?: string
  } | null
  reviewSummary?: string
  commitSha?: string
}
export declare class WorkflowPhaseListResponseDto {
  items: WorkflowPhaseResponseDto[]
}
export declare const AdvanceWorkflowPhaseResponseSchema: z.ZodObject<
  {
    previousPhaseKey: z.ZodString
    currentPhaseKey: z.ZodNullable<z.ZodString>
    workflowCompleted: z.ZodBoolean
    phases: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString
          workflowId: z.ZodString
          key: z.ZodString
          name: z.ZodString
          sequence: z.ZodNumber
          status: z.ZodEnum<{
            COMPLETED: 'COMPLETED'
            FAILED: 'FAILED'
            IN_PROGRESS: 'IN_PROGRESS'
            PENDING: 'PENDING'
            SKIPPED: 'SKIPPED'
            WAITING_APPROVAL: 'WAITING_APPROVAL'
          }>
          startedAt: z.ZodNullable<z.ZodString>
          completedAt: z.ZodNullable<z.ZodString>
          execution: z.ZodOptional<
            z.ZodNullable<
              z.ZodObject<
                {
                  status: z.ZodString
                  runType: z.ZodOptional<z.ZodString>
                  branch: z.ZodOptional<z.ZodString>
                  workspacePath: z.ZodOptional<z.ZodString>
                  pullRequestUrl: z.ZodOptional<z.ZodString>
                  pullRequestNumber: z.ZodOptional<z.ZodNumber>
                  lastError: z.ZodOptional<z.ZodString>
                  updatedAt: z.ZodOptional<z.ZodString>
                },
                z.core.$strip
              >
            >
          >
          reviewSummary: z.ZodOptional<z.ZodString>
          commitSha: z.ZodOptional<z.ZodString>
        },
        z.core.$strip
      >
    >
  },
  z.core.$strip
>
declare const AdvanceWorkflowPhaseResponseDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      previousPhaseKey: z.ZodString
      currentPhaseKey: z.ZodNullable<z.ZodString>
      workflowCompleted: z.ZodBoolean
      phases: z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString
            workflowId: z.ZodString
            key: z.ZodString
            name: z.ZodString
            sequence: z.ZodNumber
            status: z.ZodEnum<{
              COMPLETED: 'COMPLETED'
              FAILED: 'FAILED'
              IN_PROGRESS: 'IN_PROGRESS'
              PENDING: 'PENDING'
              SKIPPED: 'SKIPPED'
              WAITING_APPROVAL: 'WAITING_APPROVAL'
            }>
            startedAt: z.ZodNullable<z.ZodString>
            completedAt: z.ZodNullable<z.ZodString>
            execution: z.ZodOptional<
              z.ZodNullable<
                z.ZodObject<
                  {
                    status: z.ZodString
                    runType: z.ZodOptional<z.ZodString>
                    branch: z.ZodOptional<z.ZodString>
                    workspacePath: z.ZodOptional<z.ZodString>
                    pullRequestUrl: z.ZodOptional<z.ZodString>
                    pullRequestNumber: z.ZodOptional<z.ZodNumber>
                    lastError: z.ZodOptional<z.ZodString>
                    updatedAt: z.ZodOptional<z.ZodString>
                  },
                  z.core.$strip
                >
              >
            >
            reviewSummary: z.ZodOptional<z.ZodString>
            commitSha: z.ZodOptional<z.ZodString>
          },
          z.core.$strip
        >
      >
    },
    z.core.$strip
  >,
  false
>
export declare class AdvanceWorkflowPhaseResponseDto extends AdvanceWorkflowPhaseResponseDto_base {
  previousPhaseKey: string
  currentPhaseKey: string | null
  workflowCompleted: boolean
  phases: WorkflowPhaseResponseDto[]
}
export declare const ApproveWorkflowPhaseSchema: z.ZodObject<
  {
    note: z.ZodOptional<z.ZodString>
  },
  z.core.$strip
>
declare const ApproveWorkflowPhaseDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      note: z.ZodOptional<z.ZodString>
    },
    z.core.$strip
  >,
  false
>
export declare class ApproveWorkflowPhaseDto extends ApproveWorkflowPhaseDto_base {
  note?: string
}
export declare const SendBackPhaseSchema: z.ZodObject<
  {
    targetPhaseKey: z.ZodString
    reason: z.ZodOptional<z.ZodString>
  },
  z.core.$strip
>
declare const SendBackPhaseDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      targetPhaseKey: z.ZodString
      reason: z.ZodOptional<z.ZodString>
    },
    z.core.$strip
  >,
  false
>
export declare class SendBackPhaseDto extends SendBackPhaseDto_base {
  targetPhaseKey: string
  reason?: string
}
export {}
//# sourceMappingURL=workflow-phase.schemas.d.ts.map
