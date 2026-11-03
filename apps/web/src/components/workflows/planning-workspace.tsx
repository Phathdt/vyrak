import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/api/client'
import {
  useWorkflowPlanningControllerGetPlanningSession,
  useWorkflowPlanningControllerGeneratePRDFromMessage,
} from '@/api/generated/workflows-planning/workflows-planning'
import { ChatMarkdown } from '@/components/chat-markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useWebSocketChat } from '@/hooks/use-websocket-chat'

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

function PlanningMessageList({
  messages,
  streamingContent,
  isStreaming,
  onCreatePRD,
  isCreatingPRD,
}: {
  messages: PlanningMessage[]
  streamingContent?: string
  isStreaming?: boolean
  onCreatePRD: (messageId: string) => Promise<void>
  isCreatingPRD: boolean
}) {
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4'>
      {messages.length === 0 && !isStreaming && (
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
                <>
                  <ChatMarkdown content={msg.content} />
                  <div className='mt-3 border-t pt-3'>
                    <Button size='sm' variant='outline' onClick={() => onCreatePRD(msg.id)} disabled={isCreatingPRD}>
                      {isCreatingPRD ? 'Creating PRD...' : '📄 Create PRD from this message'}
                    </Button>
                  </div>
                </>
              ) : (
                <p className='whitespace-pre-wrap'>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isStreaming && streamingContent && (
          <div className='flex justify-start'>
            <div className='max-w-[85%] rounded-lg border bg-background px-4 py-3 text-sm shadow-sm'>
              <ChatMarkdown content={streamingContent} />
              <span className='ml-1 inline-block h-4 w-2 animate-pulse bg-foreground'>▊</span>
            </div>
          </div>
        )}
        {isStreaming && !streamingContent && (
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
  onError: (message: string | null) => void
}

export function PlanningWorkspace({ orgId, projectId, workflowId, onError }: PlanningWorkspaceProps) {
  const queryClient = useQueryClient()
  const [inputMessage, setInputMessage] = useState('')
  const [showSnippet, setShowSnippet] = useState(false)
  const [snippetPath, setSnippetPath] = useState('')
  const [snippetContent, setSnippetContent] = useState('')
  const [sessionId] = useState(() => crypto.randomUUID())

  const { mutateAsync: createPRDFromMessage, isPending: isCreatingPRD } =
    useWorkflowPlanningControllerGeneratePRDFromMessage()

  // Load session data (previous messages)
  const { data: sessionData } = useWorkflowPlanningControllerGetPlanningSession(orgId, projectId, workflowId, {
    query: {
      enabled: true,
      staleTime: 30000,
    },
  })

  // Memoize initial messages to prevent infinite loop
  const initialMessages = useMemo(() => sessionData?.messages ?? [], [sessionData?.messages])

  // Use WebSocket for real-time chat with initial messages from API
  const { isConnected, messages, streamingContent, isStreaming, sendMessage } = useWebSocketChat({
    orgId,
    projectId,
    workflowId,
    sessionId,
    enabled: true,
    initialMessages,
  })

  const planningMessages = useMemo((): PlanningMessage[] => {
    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.createdAt),
    }))
  }, [messages])

  const linkedRepos = sessionData?.repositories ?? []

  const handleCreatePRD = async (messageId: string) => {
    onError(null)
    try {
      const result = await createPRDFromMessage({
        orgId,
        projectId,
        id: workflowId,
        data: { messageId },
      })
      // Refresh artifacts list
      await queryClient.invalidateQueries({ queryKey: ['artifacts', workflowId] })
      toast.success('PRD artifact created', {
        description: result.title,
      })
    } catch (err) {
      onError(getErrorMessage(err) || 'Failed to create PRD artifact')
    }
  }

  const handleSend = async () => {
    if (!inputMessage.trim() || isStreaming || !isConnected) return

    onError(null)
    const userMessage = inputMessage.trim()
    setInputMessage('')

    const codeSnippets =
      showSnippet && snippetContent.trim()
        ? [{ language: 'text', code: snippetContent.trim() }] // Match WebSocket contract
        : undefined

    // WebSocket sendMessage doesn't throw, just call it
    sendMessage(userMessage, codeSnippets)
  }

  return (
    <div className='flex min-h-[520px] flex-col gap-4'>
      {/* Connection status */}
      {!isConnected && (
        <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100'>
          <div className='flex items-center gap-2'>
            <div className='h-2 w-2 animate-pulse rounded-full bg-amber-500' />
            <span className='font-medium'>Reconnecting to chat server...</span>
          </div>
        </div>
      )}

      {linkedRepos.length > 0 && (
        <p className='text-xs text-muted-foreground'>
          Linked repos: {linkedRepos.map((r) => r.name).join(', ')} — default files load from local checkout when{' '}
          <code className='rounded bg-muted px-1'>MAIN_REPOS_PATH</code> is set.
        </p>
      )}

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/50'>
        <PlanningMessageList
          messages={planningMessages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          onCreatePRD={handleCreatePRD}
          isCreatingPRD={isCreatingPRD}
        />
      </div>

      {planningMessages.length === 0 && (
        <div className='flex flex-wrap gap-2'>
          {PLANNING_STARTERS.map((prompt) => (
            <Button
              key={prompt}
              type='button'
              variant='outline'
              size='sm'
              className='h-auto whitespace-normal text-left text-xs'
              disabled={isStreaming}
              onClick={() => setInputMessage(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      )}

      <details className='rounded-lg border bg-background p-3 text-sm'>
        <summary className='cursor-pointer font-medium'>Context for AI (code snippets)</summary>
        <div className='mt-3 space-y-3'>
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
                disabled={isStreaming}
              />
              <Textarea
                value={snippetContent}
                onChange={(e) => setSnippetContent(e.target.value)}
                rows={6}
                placeholder='Paste relevant source here…'
                disabled={isStreaming}
                className='font-mono text-xs'
              />
            </div>
          )}
        </div>
      </details>

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
          disabled={isStreaming}
        />
        <Button onClick={() => void handleSend()} disabled={isStreaming || !inputMessage.trim()} className='self-end'>
          {isStreaming ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
