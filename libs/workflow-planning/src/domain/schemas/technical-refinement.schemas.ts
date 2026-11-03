import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Code snippet for technical refinement chat
export const CodeSnippetSchema = z.object({
  label: z.string().optional(),
  path: z.string().optional(),
  content: z.string(),
})

// Technical Refinement Chat Request
export const TechnicalRefinementChatRequestSchema = z.object({
  userMessage: z.string().min(1, 'Message is required'),
  codeSnippets: z.array(CodeSnippetSchema).optional(),
})

export class TechnicalRefinementChatRequestDto extends createZodDto(TechnicalRefinementChatRequestSchema) {}

// Technical Refinement Chat Response
export const TechnicalRefinementChatResponseSchema = z.object({
  sessionId: z.string(),
  aiMessage: z.string(),
  messageCount: z.number(),
  repoFilesLoaded: z.array(
    z.object({
      path: z.string(),
      bytes: z.number(),
    })
  ),
})

export class TechnicalRefinementChatResponseDto extends createZodDto(TechnicalRefinementChatResponseSchema) {}

// Technical Refinement Session Response
export const TechnicalRefinementSessionResponseSchema = z.object({
  sessionId: z.string().nullable(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.string(),
      content: z.string(),
      createdAt: z.string(),
    })
  ),
  messageCount: z.number(),
  repositories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      url: z.string(),
      branch: z.string(),
    })
  ),
  prdArtifact: z
    .object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
    })
    .nullable(),
})

export class TechnicalRefinementSessionResponseDto extends createZodDto(TechnicalRefinementSessionResponseSchema) {}

// Generated Artifact Info
export const GeneratedArtifactSchema = z.object({
  id: z.string(),
  type: z.string(),
  key: z.string(),
  title: z.string(),
  version: z.number(),
})

// Generate Artifacts Response
export const GenerateArtifactsResponseSchema = z.object({
  artifacts: z.array(GeneratedArtifactSchema),
  count: z.number(),
  types: z.array(z.string()),
})

export class GenerateArtifactsResponseDto extends createZodDto(GenerateArtifactsResponseSchema) {}

// Generated Sub-Task Info
export const GeneratedSubTaskSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dependencies: z.array(z.string()),
})

// Generate Sub-Tasks Response
export const GenerateSubTasksResponseSchema = z.object({
  subTasks: z.array(GeneratedSubTaskSchema),
  count: z.number(),
  dependencyCount: z.number(),
})

export class GenerateSubTasksResponseDto extends createZodDto(GenerateSubTasksResponseSchema) {}

// Sub-Tasks List Response
export const SubTaskListItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  executionOrder: z.number(),
  dependencies: z.array(z.string()),
})

export const SubTasksListResponseSchema = z.object({
  tasks: z.array(SubTaskListItemSchema),
  count: z.number(),
})

export class SubTasksListResponseDto extends createZodDto(SubTasksListResponseSchema) {}
