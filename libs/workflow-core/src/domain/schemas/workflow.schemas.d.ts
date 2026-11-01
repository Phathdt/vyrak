import { z } from 'zod'

import { WorkflowStatus, WorkflowType } from '../entities'
export declare const CreateWorkflowSchema: z.ZodObject<
  {
    title: z.ZodString
    description: z.ZodOptional<z.ZodString>
    repositoryIds: z.ZodArray<z.ZodString>
  },
  z.core.$strip
>
declare const CreateWorkflowDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      title: z.ZodString
      description: z.ZodOptional<z.ZodString>
      repositoryIds: z.ZodArray<z.ZodString>
    },
    z.core.$strip
  >,
  false
>
export declare class CreateWorkflowDto extends CreateWorkflowDto_base {}
export declare const UpdateWorkflowSchema: z.ZodObject<
  {
    title: z.ZodOptional<z.ZodString>
    description: z.ZodOptional<z.ZodString>
  },
  z.core.$strip
>
declare const UpdateWorkflowDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      title: z.ZodOptional<z.ZodString>
      description: z.ZodOptional<z.ZodString>
    },
    z.core.$strip
  >,
  false
>
export declare class UpdateWorkflowDto extends UpdateWorkflowDto_base {}
export declare const ListWorkflowsQuerySchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>
    search: z.ZodOptional<z.ZodString>
    type: z.ZodOptional<
      z.ZodEnum<{
        EPIC: 'EPIC'
        HOTFIX: 'HOTFIX'
        STORY: 'STORY'
      }>
    >
    status: z.ZodOptional<
      z.ZodEnum<{
        ACTIVE: 'ACTIVE'
        BRAINSTORMING: 'BRAINSTORMING'
        CANCELLED: 'CANCELLED'
        CLASSIFICATION_PENDING: 'CLASSIFICATION_PENDING'
        COMPLETED: 'COMPLETED'
        DRAFT: 'DRAFT'
        FAILED: 'FAILED'
        WAITING_APPROVAL: 'WAITING_APPROVAL'
      }>
    >
    createdById: z.ZodOptional<z.ZodString>
    sort: z.ZodDefault<
      z.ZodEnum<{
        createdAt: 'createdAt'
        startedAt: 'startedAt'
        title: 'title'
        updatedAt: 'updatedAt'
      }>
    >
    order: z.ZodDefault<
      z.ZodEnum<{
        asc: 'asc'
        desc: 'desc'
      }>
    >
  },
  z.core.$strip
>
declare const ListWorkflowsQueryDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      page: z.ZodDefault<z.ZodCoercedNumber<unknown>>
      limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>
      search: z.ZodOptional<z.ZodString>
      type: z.ZodOptional<
        z.ZodEnum<{
          EPIC: 'EPIC'
          HOTFIX: 'HOTFIX'
          STORY: 'STORY'
        }>
      >
      status: z.ZodOptional<
        z.ZodEnum<{
          ACTIVE: 'ACTIVE'
          BRAINSTORMING: 'BRAINSTORMING'
          CANCELLED: 'CANCELLED'
          CLASSIFICATION_PENDING: 'CLASSIFICATION_PENDING'
          COMPLETED: 'COMPLETED'
          DRAFT: 'DRAFT'
          FAILED: 'FAILED'
          WAITING_APPROVAL: 'WAITING_APPROVAL'
        }>
      >
      createdById: z.ZodOptional<z.ZodString>
      sort: z.ZodDefault<
        z.ZodEnum<{
          createdAt: 'createdAt'
          startedAt: 'startedAt'
          title: 'title'
          updatedAt: 'updatedAt'
        }>
      >
      order: z.ZodDefault<
        z.ZodEnum<{
          asc: 'asc'
          desc: 'desc'
        }>
      >
    },
    z.core.$strip
  >,
  false
>
export declare class ListWorkflowsQueryDto extends ListWorkflowsQueryDto_base {}
export declare const ClassifyWorkflowSchema: z.ZodObject<
  {
    force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>
  },
  z.core.$strip
>
declare const ClassifyWorkflowDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      force: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>
    },
    z.core.$strip
  >,
  false
>
export declare class ClassifyWorkflowDto extends ClassifyWorkflowDto_base {}
export declare const ConfirmClassificationSchema: z.ZodObject<
  {
    type: z.ZodEnum<{
      EPIC: 'EPIC'
      HOTFIX: 'HOTFIX'
      STORY: 'STORY'
    }>
  },
  z.core.$strip
>
declare const ConfirmClassificationDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      type: z.ZodEnum<{
        EPIC: 'EPIC'
        HOTFIX: 'HOTFIX'
        STORY: 'STORY'
      }>
    },
    z.core.$strip
  >,
  false
>
export declare class ConfirmClassificationDto extends ConfirmClassificationDto_base {}
export declare class WorkflowResponse {
  id: string
  organizationId: string
  projectId: string
  type: WorkflowType | null
  status:
    | WorkflowStatus
    | 'CLASSIFICATION_PENDING'
    | 'ACTIVE'
    | 'WAITING_APPROVAL'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED'
  title: string
  description: string | null
  currentPhaseKey: string | null
  definitionSnapshot: Record<string, unknown> | null
  classification: Record<string, unknown> | null
  classificationConfirmedAt: string | null
  classificationConfirmedById: string | null
  createdById: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  repositories: Array<{
    id: string
    repositoryId: string
  }>
}
export declare class PaginatedWorkflowsResponse {
  items: WorkflowResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}
export interface WorkflowWithRepositories {
  id: string
  organizationId: string
  projectId: string
  type: WorkflowType | null
  status: WorkflowStatus
  title: string
  description: string | null
  currentPhaseKey: string | null
  definitionSnapshot: Record<string, unknown> | null
  classification: Record<string, unknown> | null
  classificationConfirmedAt: Date | null
  classificationConfirmedById: string | null
  createdById: string
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  repositories: Array<{
    id: string
    repositoryId: string
  }>
}
export interface PaginatedWorkflows {
  items: WorkflowWithRepositories[]
  total: number
  page: number
  limit: number
  totalPages: number
}
export {}
//# sourceMappingURL=workflow.schemas.d.ts.map
