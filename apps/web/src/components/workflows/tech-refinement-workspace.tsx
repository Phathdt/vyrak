import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { getErrorMessage } from '@/api/client'
import { useWorkflowPlanningControllerGeneratePRDFromMessage } from '@/api/generated/workflows-planning/workflows-planning'
import { ChatMarkdown } from '@/components/chat-markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useTechRefinementChatStream, type FileChangeEvent } from '@/hooks/use-tech-refinement-chat-stream'
import { useToast } from '@/hooks/use-toast'

const TECH_REFINEMENT_STARTERS = [
  'Scout the codebase and suggest where this feature should live following hexagonal architecture.',
  'Create an ADR comparing 3 approaches for this feature with pros/cons.',
  'Break down implementation into phases with specific files to create/modify.',
  'Find similar patterns in the codebase I can reuse for this feature.',
]

type TechRefinementMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

function FileChangeBadge({ event }: { event: FileChangeEvent }) {
  const icon = event.changeType === 'file.created' ? '📄' : '✏️'
  const label = event.changeType === 'file.created' ? 'Created' : 'Updated'
  const fileName = event.path.split('/').pop() || event.path

  return (
    <div className='inline-flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'>
      <span>{icon}</span>
      <span className='font-medium'>{label}</span>
      <span className='font-mono'>{fileName}</span>
    </div>
  )
}

function TechRefinementMessageList({
  messages,
  streamingContent,
  isStreaming,
  toolActivity,
  fileChanges,
  onSaveAsArtifact,
  isSaving,
}: {
  messages: TechRefinementMessage[]
  streamingContent?: string
  isStreaming?: boolean
  toolActivity?: string
  fileChanges?: FileChangeEvent[]
  onSaveAsArtifact?: (messageId: string) => void
  isSaving?: boolean
}) {
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4'>
      {messages.length === 0 && !isStreaming && (
        <div className='text-center text-sm text-muted-foreground space-y-2'>
          <p>🔍 Technical Refinement with Code Scouting</p>
          <p className='text-xs'>
            AI can Read, Glob, and Grep your repository to make informed architectural decisions.
          </p>
        </div>
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
                  <div className='mt-3 flex gap-2 border-t pt-3'>
                    <Button size='sm' variant='outline' onClick={() => onSaveAsArtifact?.(msg.id)} disabled={isSaving}>
                      {isSaving ? 'Saving...' : '📝 Save as ADR/Plan'}
                    </Button>
                  </div>
                </>
              ) : (
                <p className='whitespace-pre-wrap'>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isStreaming && toolActivity && !streamingContent && (
          <div className='flex justify-start'>
            <div className='rounded-lg border bg-amber-50 dark:bg-amber-950 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 shadow-sm'>
              <span className='inline-flex items-center gap-2'>
                <span className='animate-pulse'>🔧</span>
                {toolActivity}
              </span>
            </div>
          </div>
        )}
        {fileChanges && fileChanges.length > 0 && (
          <div className='flex justify-start'>
            <div className='flex flex-wrap gap-2'>
              {fileChanges.map((event, idx) => (
                <FileChangeBadge key={`${event.path}-${idx}`} event={event} />
              ))}
            </div>
          </div>
        )}
        {isStreaming && streamingContent && (
          <div className='flex justify-start'>
            <div className='max-w-[85%] rounded-lg border bg-background px-4 py-3 text-sm shadow-sm'>
              <ChatMarkdown content={streamingContent} />
              <span className='ml-1 inline-block h-4 w-2 animate-pulse bg-foreground'>▊</span>
            </div>
          </div>
        )}
        {isStreaming && !streamingContent && !toolActivity && (
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

type TechRefinementWorkspaceProps = {
  orgId: string
  projectId: string
  workflowId: string
  onError: (message: string | null) => void
}

export function TechRefinementWorkspace({ orgId, projectId, workflowId, onError }: TechRefinementWorkspaceProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [inputMessage, setInputMessage] = useState('')
  const [showSnippet, setShowSnippet] = useState(false)
  const [snippetPath, setSnippetPath] = useState('')
  const [snippetContent, setSnippetContent] = useState('')

  const { mutateAsync: saveAsArtifact, isPending: isSavingArtifact } =
    useWorkflowPlanningControllerGeneratePRDFromMessage()

  // Use SSE for real-time chat with code scouting
  const { messages, streamingContent, isStreaming, toolActivity, fileChanges, sendMessage } =
    useTechRefinementChatStream({
      orgId,
      projectId,
      workflowId,
      onError,
    })

  // TODO: Fetch initial tech refinement session when backend endpoint is ready
  // For now, messages start empty
  // const { data: sessionData } = useWorkflowTechRefinementControllerGetSession(...)

  const handleSaveAsArtifact = async (messageId: string) => {
    try {
      await saveAsArtifact({
        orgId,
        projectId,
        id: workflowId,
        data: { messageId },
      })

      // Refresh artifacts list
      await queryClient.invalidateQueries({ queryKey: ['artifacts', workflowId] })
      toast({
        title: 'Success',
        description: 'Technical artifact saved successfully',
      })
    } catch (err) {
      const errorMsg = getErrorMessage(err) || 'Failed to save artifact'
      onError(errorMsg)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMsg,
      })
    }
  }

  const handleSend = async () => {
    if (!inputMessage.trim() || isStreaming) return

    onError(null)
    const userMessage = inputMessage.trim()
    setInputMessage('')

    const codeSnippets =
      showSnippet && snippetContent.trim()
        ? [{ path: snippetPath.trim() || undefined, content: snippetContent.trim() }]
        : undefined

    try {
      await sendMessage(userMessage, codeSnippets)
      // Clear snippet after sending
      if (showSnippet) {
        setSnippetPath('')
        setSnippetContent('')
        setShowSnippet(false)
      }
    } catch (err) {
      setInputMessage(userMessage)
      onError(getErrorMessage(err) || 'Failed to send message')
    }
  }

  return (
    <div className='flex min-h-[520px] flex-col gap-4'>
      <div className='rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-3 text-xs text-amber-900 dark:text-amber-100'>
        <p className='font-medium mb-1'>🔍 Code Scouting Enabled</p>
        <p>
          AI can analyze your repository structure, find similar patterns, and reference actual file paths in
          recommendations.
        </p>
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/50'>
        <TechRefinementMessageList
          messages={messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.createdAt),
          }))}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          toolActivity={toolActivity}
          fileChanges={fileChanges}
          onSaveAsArtifact={handleSaveAsArtifact}
          isSaving={isSavingArtifact}
        />
      </div>

      {messages.length === 0 && (
        <div className='flex flex-wrap gap-2'>
          {TECH_REFINEMENT_STARTERS.map((prompt) => (
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
                placeholder='Optional path or label (e.g., src/services/user.service.ts)'
                value={snippetPath}
                onChange={(e) => setSnippetPath(e.target.value)}
                disabled={isStreaming}
              />
              <Textarea
                value={snippetContent}
                onChange={(e) => setSnippetContent(e.target.value)}
                rows={6}
                placeholder='Paste code you want to discuss…'
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
          placeholder='Ask about architecture, patterns, implementation strategy… (Enter to send)'
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
