import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { getErrorMessage } from '@/api/client'
import {
  getWorkflowPlanningControllerGetPlanningSessionQueryKey,
  useWorkflowPlanningControllerGetPlanningSession,
  useWorkflowPlanningControllerPlanningChat,
} from '@/api/generated/workflows-planning/workflows-planning'
import { ChatMarkdown } from '@/components/chat-markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
const PLANNING_STARTERS = [
  'Propose a technical design: modules to touch, DB schema, API endpoints, and risks.',
  'Given our hexagonal libs pattern, where should this feature live and why?',
  'List implementation steps in order for the Implementation phase, with test notes.',
]

type PlanningMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

function PlanningMessageList({ messages, isSending }: { messages: PlanningMessage[]; isSending?: boolean }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4'>
      {messages.length === 0 && !isSending && (
        <p className='text-center text-sm text-muted-foreground'>
          Discuss architecture and implementation with AI. Attach repo paths or paste code when needed.
        </p>
      )}
      <div className='space-y-4'>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border shadow-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <ChatMarkdown content={msg.content} />
              ) : (
                <p className='whitespace-pre-wrap'>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className='flex justify-start'>
            <div className='rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm'>
              Thinking…
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type PlanningWorkspaceProps = {
  orgId: string
  projectId: string
  workflowId: string
  scopeSummary?: string
  onError: (message: string | null) => void
}

export function PlanningWorkspace({ orgId, projectId, workflowId, scopeSummary, onError }: PlanningWorkspaceProps) {
  const queryClient = useQueryClient()
  const [inputMessage, setInputMessage] = useState('')
  const [repoPathsText, setRepoPathsText] = useState('')
  const [showSnippet, setShowSnippet] = useState(false)
  const [snippetPath, setSnippetPath] = useState('')
  const [snippetContent, setSnippetContent] = useState('')
  const [lastLoadedFiles, setLastLoadedFiles] = useState<Array<{ path: string; bytes: number }>>([])

  const { data: sessionData, refetch: refetchPlanningSession } = useWorkflowPlanningControllerGetPlanningSession(
    orgId,
    projectId,
    workflowId
  )

  const { mutateAsync: sendPlanningMessage, isPending: isSending } = useWorkflowPlanningControllerPlanningChat()

  const messages = useMemo((): PlanningMessage[] => {
    return (sessionData?.messages ?? []).map((msg) => ({
      id: msg.id,
      role: msg.role as PlanningMessage['role'],
      content: msg.content,
      timestamp: new Date(msg.createdAt),
    }))
  }, [sessionData?.messages])

  const linkedRepos = sessionData?.repositories ?? []

  const handleSend = async () => {
    if (!inputMessage.trim()) return

    onError(null)
    const userMessage = inputMessage.trim()
    setInputMessage('')

    const repoPaths = repoPathsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const codeSnippets =
      showSnippet && snippetContent.trim()
        ? [{ path: snippetPath.trim() || undefined, content: snippetContent.trim() }]
        : undefined

    try {
      const response = await sendPlanningMessage({
        orgId,
        projectId,
        id: workflowId,
        data: {
          userMessage,
          repoPaths: repoPaths.length > 0 ? repoPaths : undefined,
          codeSnippets,
        },
      })
      setLastLoadedFiles(response.repoFilesLoaded ?? [])
      await queryClient.invalidateQueries({
        queryKey: getWorkflowPlanningControllerGetPlanningSessionQueryKey(orgId, projectId, workflowId),
      })
      await refetchPlanningSession()
    } catch (err) {
      setInputMessage(userMessage)
      onError(getErrorMessage(err) || 'Failed to send planning message')
    }
  }

  return (
    <div className='flex min-h-[520px] flex-col gap-4'>
      {scopeSummary && (
        <div className='rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm'>
          <p className='mb-1 font-medium'>Scope from brainstorm</p>
          <p className='leading-relaxed text-foreground/90'>{scopeSummary}</p>
        </div>
      )}

      {linkedRepos.length > 0 && (
        <p className='text-xs text-muted-foreground'>
          Linked repos: {linkedRepos.map((r) => r.name).join(', ')} — default files load from local checkout when{' '}
          <code className='rounded bg-muted px-1'>MAIN_REPOS_PATH</code> is set.
        </p>
      )}

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/50'>
        <PlanningMessageList messages={messages} isSending={isSending} />
      </div>

      {messages.length === 0 && (
        <div className='flex flex-wrap gap-2'>
          {PLANNING_STARTERS.map((prompt) => (
            <Button
              key={prompt}
              type='button'
              variant='outline'
              size='sm'
              className='h-auto whitespace-normal text-left text-xs'
              disabled={isSending}
              onClick={() => setInputMessage(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      )}

      <details className='rounded-lg border bg-background p-3 text-sm'>
        <summary className='cursor-pointer font-medium'>Context for AI (repo paths & snippets)</summary>
        <div className='mt-3 space-y-3'>
          <div>
            <label className='mb-1 block text-xs text-muted-foreground'>
              Repo-relative paths (one per line). Leave empty to load README, package.json, CLAUDE.md, prisma/schema.
            </label>
            <Textarea
              value={repoPathsText}
              onChange={(e) => setRepoPathsText(e.target.value)}
              rows={3}
              placeholder={'libs/product/src/application/services/product.service.ts\napps/web/src/App.tsx'}
              disabled={isSending}
              className='font-mono text-xs'
            />
          </div>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='outline' size='sm' onClick={() => setShowSnippet((v) => !v)}>
              {showSnippet ? 'Hide snippet' : 'Paste code snippet'}
            </Button>
          </div>
          {showSnippet && (
            <div className='space-y-2'>
              <input
                type='text'
                className='w-full rounded-md border bg-background px-3 py-2 text-xs font-mono'
                placeholder='Optional path or label'
                value={snippetPath}
                onChange={(e) => setSnippetPath(e.target.value)}
                disabled={isSending}
              />
              <Textarea
                value={snippetContent}
                onChange={(e) => setSnippetContent(e.target.value)}
                rows={6}
                placeholder='Paste relevant source here…'
                disabled={isSending}
                className='font-mono text-xs'
              />
            </div>
          )}
        </div>
      </details>

      {lastLoadedFiles.length > 0 && (
        <p className='text-xs text-muted-foreground'>
          Loaded from repo: {lastLoadedFiles.map((f) => `${f.path} (${f.bytes} B)`).join(', ')}
        </p>
      )}

      <div className='flex shrink-0 gap-2'>
        <Textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder='Ask about architecture, APIs, schema… (Enter to send)'
          rows={3}
          disabled={isSending}
        />
        <Button onClick={() => void handleSend()} disabled={isSending || !inputMessage.trim()} className='self-end'>
          {isSending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
