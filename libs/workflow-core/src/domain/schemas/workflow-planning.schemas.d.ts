import { z } from 'zod'
export declare const PlanningCodeSnippetSchema: z.ZodObject<
  {
    path: z.ZodOptional<z.ZodString>
    label: z.ZodOptional<z.ZodString>
    content: z.ZodString
  },
  z.core.$strip
>
export declare const PlanningChatRequestSchema: z.ZodObject<
  {
    userMessage: z.ZodString
    codeSnippets: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            path: z.ZodOptional<z.ZodString>
            label: z.ZodOptional<z.ZodString>
            content: z.ZodString
          },
          z.core.$strip
        >
      >
    >
    repoPaths: z.ZodOptional<z.ZodArray<z.ZodString>>
  },
  z.core.$strip
>
declare const PlanningCodeSnippetDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      path: z.ZodOptional<z.ZodString>
      label: z.ZodOptional<z.ZodString>
      content: z.ZodString
    },
    z.core.$strip
  >,
  false
>
export declare class PlanningCodeSnippetDto extends PlanningCodeSnippetDto_base {
  path?: string
  label?: string
  content: string
}
declare const PlanningChatRequestDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      userMessage: z.ZodString
      codeSnippets: z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              path: z.ZodOptional<z.ZodString>
              label: z.ZodOptional<z.ZodString>
              content: z.ZodString
            },
            z.core.$strip
          >
        >
      >
      repoPaths: z.ZodOptional<z.ZodArray<z.ZodString>>
    },
    z.core.$strip
  >,
  false
>
export declare class PlanningChatRequestDto extends PlanningChatRequestDto_base {
  userMessage: string
  codeSnippets?: PlanningCodeSnippetDto[]
  repoPaths?: string[]
}
export declare const PlanningMessageSchema: z.ZodObject<
  {
    id: z.ZodString
    role: z.ZodEnum<{
      assistant: 'assistant'
      system: 'system'
      user: 'user'
    }>
    content: z.ZodString
    createdAt: z.ZodString
  },
  z.core.$strip
>
declare const PlanningMessageDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      id: z.ZodString
      role: z.ZodEnum<{
        assistant: 'assistant'
        system: 'system'
        user: 'user'
      }>
      content: z.ZodString
      createdAt: z.ZodString
    },
    z.core.$strip
  >,
  false
>
export declare class PlanningMessageDto extends PlanningMessageDto_base {}
export declare const PlanningSessionResponseSchema: z.ZodObject<
  {
    sessionId: z.ZodNullable<z.ZodString>
    messages: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString
          role: z.ZodEnum<{
            assistant: 'assistant'
            system: 'system'
            user: 'user'
          }>
          content: z.ZodString
          createdAt: z.ZodString
        },
        z.core.$strip
      >
    >
    messageCount: z.ZodNumber
    repositories: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString
          name: z.ZodString
          url: z.ZodString
          branch: z.ZodString
        },
        z.core.$strip
      >
    >
  },
  z.core.$strip
>
declare const PlanningSessionResponseDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      sessionId: z.ZodNullable<z.ZodString>
      messages: z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString
            role: z.ZodEnum<{
              assistant: 'assistant'
              system: 'system'
              user: 'user'
            }>
            content: z.ZodString
            createdAt: z.ZodString
          },
          z.core.$strip
        >
      >
      messageCount: z.ZodNumber
      repositories: z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString
            name: z.ZodString
            url: z.ZodString
            branch: z.ZodString
          },
          z.core.$strip
        >
      >
    },
    z.core.$strip
  >,
  false
>
export declare class PlanningSessionResponseDto extends PlanningSessionResponseDto_base {
  sessionId: string | null
  messages: PlanningMessageDto[]
  messageCount: number
  repositories: Array<{
    id: string
    name: string
    url: string
    branch: string
  }>
}
export declare const PlanningChatResponseSchema: z.ZodObject<
  {
    sessionId: z.ZodString
    aiMessage: z.ZodString
    messageCount: z.ZodNumber
    repoFilesLoaded: z.ZodArray<
      z.ZodObject<
        {
          path: z.ZodString
          bytes: z.ZodNumber
        },
        z.core.$strip
      >
    >
  },
  z.core.$strip
>
declare const PlanningChatResponseDto_base: import('nestjs-zod').ZodDto<
  z.ZodObject<
    {
      sessionId: z.ZodString
      aiMessage: z.ZodString
      messageCount: z.ZodNumber
      repoFilesLoaded: z.ZodArray<
        z.ZodObject<
          {
            path: z.ZodString
            bytes: z.ZodNumber
          },
          z.core.$strip
        >
      >
    },
    z.core.$strip
  >,
  false
>
export declare class PlanningChatResponseDto extends PlanningChatResponseDto_base {
  sessionId: string
  aiMessage: string
  messageCount: number
  repoFilesLoaded: Array<{
    path: string
    bytes: number
  }>
}
export {}
//# sourceMappingURL=workflow-planning.schemas.d.ts.map
